// src/firebase/firestoreService.js
// Firestore service functions for user profiles, scheduled meetings, and meeting history
// Profile pictures are stored in Cloudinary (not Firebase Storage) to stay on free Spark plan

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

// ============================================================
// CONSTANTS
// ============================================================

const MAX_SCHEDULED_MEETINGS = 4;
const HISTORY_RETENTION_DAYS = 7; // Changed from 15 to 7 days per user request

// ============================================================
// USER PROFILE FUNCTIONS
// ============================================================

/**
 * Creates a new user profile in Firestore
 * Called after user signs up for the first time
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @param {string} displayName - User's display name
 * @param {string} bio - User's bio (max 500 chars)
 * @returns {Promise<void>}
 */
export const createUserProfile = async (uid, displayName, bio = '') => {
  // Validate bio length
  if (bio.length > 500) {
    throw new Error('Bio must be 500 characters or less');
  }

  // Reference to the user document
  const userRef = doc(db, 'users', uid);
  
  // Check if profile already exists
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    throw new Error('User profile already exists');
  }

  // Create the user profile document
  await setDoc(userRef, {
    displayName: displayName.trim(),
    bio: bio.trim(),
    profilePicUrl: '', // Empty until user uploads a picture
    createdAt: serverTimestamp()
  });

  console.log('✅ User profile created successfully');
};

/**
 * Updates an existing user profile
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @param {Object} updates - Object containing fields to update
 * @param {string} [updates.displayName] - New display name
 * @param {string} [updates.bio] - New bio (max 500 chars)
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (uid, updates) => {
  // Validate bio if provided
  if (updates.bio && updates.bio.length > 500) {
    throw new Error('Bio must be 500 characters or less');
  }

  const userRef = doc(db, 'users', uid);
  
  // Build update object with only provided fields
  const updateData = {};
  if (updates.displayName) updateData.displayName = updates.displayName.trim();
  if (updates.bio !== undefined) updateData.bio = updates.bio.trim();

  await updateDoc(userRef, updateData);
  console.log('✅ User profile updated successfully');
};

/**
 * Updates the user's profile picture URL in Firestore
 * The actual image is stored in Cloudinary, we only store the URL here
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @param {string} imageUrl - The Cloudinary URL of the uploaded image
 * @returns {Promise<void>}
 */
export const updateProfilePicUrl = async (uid, imageUrl) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { profilePicUrl: imageUrl });
  console.log('✅ Profile picture URL updated successfully');
};

/**
 * Gets a user's profile data
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @returns {Promise<Object|null>} - The user profile data or null
 */
export const getUserProfile = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() };
  }
  return null;
};

/**
 * Deletes all user data from Firestore
 * This includes: user profile, scheduled meetings, and meeting history
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @returns {Promise<void>}
 */
export const deleteUserData = async (uid) => {
  try {
    // Delete all scheduled meetings
    const scheduledMeetingsRef = collection(db, 'users', uid, 'scheduledMeetings');
    const scheduledMeetingsSnapshot = await getDocs(scheduledMeetingsRef);
    const deleteScheduledPromises = scheduledMeetingsSnapshot.docs.map((docSnap) =>
      deleteDoc(doc(db, 'users', uid, 'scheduledMeetings', docSnap.id))
    );
    await Promise.all(deleteScheduledPromises);
    console.log('✅ Deleted all scheduled meetings');

    // Delete all meeting history
    const historyRef = collection(db, 'users', uid, 'meetingHistory');
    const historySnapshot = await getDocs(historyRef);
    const deleteHistoryPromises = historySnapshot.docs.map((docSnap) =>
      deleteDoc(doc(db, 'users', uid, 'meetingHistory', docSnap.id))
    );
    await Promise.all(deleteHistoryPromises);
    console.log('✅ Deleted all meeting history');

    // Delete the user profile document
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
    console.log('✅ Deleted user profile');

    console.log('✅ All user data deleted successfully');
  } catch (error) {
    console.error('Error deleting user data:', error);
    throw new Error('Failed to delete user data. Please try again.');
  }
};

// ============================================================
// SCHEDULED MEETINGS FUNCTIONS
// ============================================================

/**
 * Gets the count of currently scheduled meetings
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @returns {Promise<number>} - Number of scheduled meetings
 */
export const getScheduledMeetingsCount = async (uid) => {
  const meetingsRef = collection(db, 'users', uid, 'scheduledMeetings');
  const snapshot = await getDocs(meetingsRef);
  return snapshot.size;
};

/**
 * Schedules a new meeting
 * BLOCKS if user already has 4 or more scheduled meetings
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @param {Object} meetingData - Meeting details
 * @param {string} meetingData.title - Meeting title
 * @param {string} meetingData.description - Meeting description
 * @param {Date} meetingData.scheduledAt - When the meeting is scheduled
 * @param {number} meetingData.durationMinutes - Duration in minutes (5-480)
 * @returns {Promise<string>} - The created meeting ID
 * @throws {Error} - If user has reached maximum meetings limit
 */
export const scheduleMeeting = async (uid, meetingData) => {
  // ============================================================
  // ENFORCING THE 4-MEETING LIMIT
  // ============================================================
  // We check the count BEFORE creating to prevent exceeding the limit.
  // This is done client-side because Firestore security rules cannot
  // count documents in a subcollection. The rules validate data format,
  // while the client enforces business logic like limits.
  // ============================================================
  
  const currentCount = await getScheduledMeetingsCount(uid);
  
  if (currentCount >= MAX_SCHEDULED_MEETINGS) {
    throw new Error(
      `Maximum limit reached. You can only have ${MAX_SCHEDULED_MEETINGS} scheduled meetings. ` +
      'Please delete an existing meeting before scheduling a new one.'
    );
  }

  // Validate duration
  if (meetingData.durationMinutes < 5 || meetingData.durationMinutes > 480) {
    throw new Error('Meeting duration must be between 5 and 480 minutes');
  }

  // Reference to the scheduledMeetings subcollection
  const meetingsRef = collection(db, 'users', uid, 'scheduledMeetings');

  // Create the meeting document
  const docRef = await addDoc(meetingsRef, {
    title: meetingData.title.trim(),
    description: meetingData.description?.trim() || '',
    scheduledAt: Timestamp.fromDate(new Date(meetingData.scheduledAt)),
    durationMinutes: meetingData.durationMinutes,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  console.log('✅ Meeting scheduled successfully:', docRef.id);
  return docRef.id;
};

/**
 * Edits an existing scheduled meeting
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @param {string} meetingId - The meeting document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const editScheduledMeeting = async (uid, meetingId, updates) => {
  const meetingRef = doc(db, 'users', uid, 'scheduledMeetings', meetingId);

  // Build update object
  const updateData = { updatedAt: serverTimestamp() };
  
  if (updates.title) updateData.title = updates.title.trim();
  if (updates.description !== undefined) updateData.description = updates.description.trim();
  if (updates.scheduledAt) updateData.scheduledAt = Timestamp.fromDate(new Date(updates.scheduledAt));
  if (updates.durationMinutes) {
    if (updates.durationMinutes < 5 || updates.durationMinutes > 480) {
      throw new Error('Meeting duration must be between 5 and 480 minutes');
    }
    updateData.durationMinutes = updates.durationMinutes;
  }

  await updateDoc(meetingRef, updateData);
  console.log('✅ Meeting updated successfully');
};

/**
 * Deletes a scheduled meeting
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @param {string} meetingId - The meeting document ID
 * @returns {Promise<void>}
 */
export const deleteScheduledMeeting = async (uid, meetingId) => {
  const meetingRef = doc(db, 'users', uid, 'scheduledMeetings', meetingId);
  await deleteDoc(meetingRef);
  console.log('✅ Meeting deleted successfully');
};

/**
 * Gets all scheduled meetings for a user
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @returns {Promise<Array>} - Array of scheduled meetings
 */
export const getScheduledMeetings = async (uid) => {
  const meetingsRef = collection(db, 'users', uid, 'scheduledMeetings');
  const q = query(meetingsRef, orderBy('scheduledAt', 'asc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// ============================================================
// MEETING HISTORY FUNCTIONS
// ============================================================

/**
 * Adds a completed meeting to history
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @param {Object} historyData - Meeting history details
 * @param {string} historyData.title - Meeting title
 * @param {Date} historyData.startedAt - When meeting started
 * @param {Date} historyData.endedAt - When meeting ended
 * @param {number} historyData.participantsCount - Number of participants
 * @returns {Promise<string>} - The created history document ID
 */
export const addMeetingToHistory = async (uid, historyData) => {
  const historyRef = collection(db, 'users', uid, 'meetingHistory');

  const docRef = await addDoc(historyRef, {
    title: historyData.title,
    startedAt: Timestamp.fromDate(new Date(historyData.startedAt)),
    endedAt: Timestamp.fromDate(new Date(historyData.endedAt)),
    participantsCount: historyData.participantsCount
  });

  console.log('✅ Meeting added to history:', docRef.id);
  return docRef.id;
};

/**
 * Cleans up meeting history older than 15 days
 * This should be called periodically (e.g., on app load or via scheduled function)
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @returns {Promise<number>} - Number of deleted records
 */
export const cleanupOldMeetingHistory = async (uid) => {
  // Calculate the cutoff date (15 days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - HISTORY_RETENTION_DAYS);
  const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

  // Query for old history entries
  const historyRef = collection(db, 'users', uid, 'meetingHistory');
  const q = query(
    historyRef,
    where('endedAt', '<', cutoffTimestamp)
  );

  const snapshot = await getDocs(q);
  
  // Delete each old document
  let deletedCount = 0;
  const deletePromises = snapshot.docs.map(async (docSnap) => {
    await deleteDoc(doc(db, 'users', uid, 'meetingHistory', docSnap.id));
    deletedCount++;
  });

  await Promise.all(deletePromises);
  
  if (deletedCount > 0) {
    console.log(`🗑️ Cleaned up ${deletedCount} old meeting history records`);
  }
  
  return deletedCount;
};

/**
 * Gets meeting history for a user (last 15 days)
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @returns {Promise<Array>} - Array of meeting history entries
 */
export const getMeetingHistory = async (uid) => {
  // First, cleanup old entries
  await cleanupOldMeetingHistory(uid);

  // Then fetch remaining history
  const historyRef = collection(db, 'users', uid, 'meetingHistory');
  const q = query(historyRef, orderBy('startedAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// ============================================================
// INSTANT MEETINGS FUNCTIONS (for Start Meeting with invites)
// ============================================================

/**
 * Creates an instant meeting with invited participants
 * Stores in a global 'meetings' collection for validation
 * 
 * @param {string} meetingId - The unique meeting ID (UUID)
 * @param {Object} meetingData - Meeting details
 * @param {string} meetingData.title - Meeting title
 * @param {string} meetingData.description - Meeting description (optional)
 * @param {Array<string>} meetingData.invitedEmails - Array of invited participant emails
 * @param {string} meetingData.creatorUid - Creator's user ID
 * @param {string} meetingData.creatorEmail - Creator's email
 * @param {string} meetingData.creatorName - Creator's display name
 * @param {string} meetingData.creatorProfilePic - Creator's profile picture URL
 * @returns {Promise<Object>} - The created meeting object
 */
export const createInstantMeeting = async (meetingId, meetingData) => {
  const meetingRef = doc(db, 'meetings', meetingId);
  
  const meeting = {
    id: meetingId,
    title: meetingData.title || 'Untitled Meeting',
    description: meetingData.description || '',
    invitedEmails: meetingData.invitedEmails || [],
    creatorUid: meetingData.creatorUid,
    creatorEmail: meetingData.creatorEmail,
    creatorName: meetingData.creatorName || 'Host',
    creatorProfilePic: meetingData.creatorProfilePic || '',
    isActive: true,
    createdAt: serverTimestamp(),
    participants: [] // Will store joined participants
  };

  await setDoc(meetingRef, meeting);
  console.log('✅ Instant meeting created:', meetingId);
  
  return meeting;
};

/**
 * Gets meeting details by meeting ID
 * 
 * @param {string} meetingId - The meeting ID
 * @returns {Promise<Object|null>} - The meeting data or null
 */
export const getMeetingById = async (meetingId) => {
  const meetingRef = doc(db, 'meetings', meetingId);
  const meetingSnap = await getDoc(meetingRef);
  
  if (meetingSnap.exists()) {
    return { id: meetingSnap.id, ...meetingSnap.data() };
  }
  return null;
};

/**
 * Validates if a user can join a meeting
 * User must be either the creator or in the invited list
 * 
 * @param {string} meetingId - The meeting ID
 * @param {string} userEmail - The user's email attempting to join
 * @returns {Promise<Object>} - { isAllowed: boolean, reason: string, meeting: Object|null }
 */
export const validateMeetingParticipant = async (meetingId, userEmail) => {
  const meeting = await getMeetingById(meetingId);
  
  if (!meeting) {
    return {
      isAllowed: false,
      reason: 'Meeting not found. Please check the meeting ID.',
      meeting: null
    };
  }

  // Normalize email for comparison
  const normalizedUserEmail = userEmail.toLowerCase().trim();
  const normalizedCreatorEmail = meeting.creatorEmail?.toLowerCase().trim();
  const normalizedInvitedEmails = (meeting.invitedEmails || []).map(e => e.toLowerCase().trim());

  // Check if user is the creator
  if (normalizedUserEmail === normalizedCreatorEmail) {
    return {
      isAllowed: true,
      reason: 'You are the meeting host.',
      meeting,
      isHost: true
    };
  }

  // Check if user is in the invited list
  if (normalizedInvitedEmails.includes(normalizedUserEmail)) {
    return {
      isAllowed: true,
      reason: 'You are invited to this meeting.',
      meeting,
      isHost: false
    };
  }

  // Check if no participants were invited (open meeting)
  if (normalizedInvitedEmails.length === 0 || (normalizedInvitedEmails.length === 1 && normalizedInvitedEmails[0] === '')) {
    return {
      isAllowed: true,
      reason: 'This is an open meeting.',
      meeting,
      isHost: false
    };
  }

  return {
    isAllowed: false,
    reason: 'You are not invited to this meeting. Please contact the host to get an invitation.',
    meeting: null
  };
};

/**
 * Adds a participant to a meeting's participant list
 * 
 * @param {string} meetingId - The meeting ID
 * @param {Object} participant - Participant details
 * @param {string} participant.uid - Participant's user ID
 * @param {string} participant.email - Participant's email
 * @param {string} participant.displayName - Participant's display name
 * @param {string} participant.profilePicUrl - Participant's profile picture URL
 * @returns {Promise<void>}
 */
export const addParticipantToMeeting = async (meetingId, participant) => {
  const meetingRef = doc(db, 'meetings', meetingId);
  const meetingSnap = await getDoc(meetingRef);
  
  if (!meetingSnap.exists()) {
    throw new Error('Meeting not found');
  }

  const currentParticipants = meetingSnap.data().participants || [];
  
  // Check if participant already exists
  const existingIndex = currentParticipants.findIndex(p => p.uid === participant.uid);
  
  if (existingIndex === -1) {
    // Add new participant
    currentParticipants.push({
      uid: participant.uid,
      email: participant.email,
      displayName: participant.displayName || 'Anonymous',
      profilePicUrl: participant.profilePicUrl || '',
      joinedAt: new Date().toISOString()
    });
    
    await updateDoc(meetingRef, { participants: currentParticipants });
    console.log('✅ Participant added to meeting:', participant.email);
  }
};

/**
 * Get user profile by email
 * 
 * @param {string} email - The user's email
 * @returns {Promise<Object|null>} - The user profile or null
 */
export const getUserProfileByEmail = async (email) => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return null;
};

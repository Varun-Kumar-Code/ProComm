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
  Timestamp,
  onSnapshot,
  writeBatch,
  limit
} from 'firebase/firestore';
import { db } from './config';
import { getAssessment } from './assessmentService';

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
 * @param {string} email - User's email address
 * @param {string} bio - User's bio (max 500 chars)
 * @returns {Promise<void>}
 */
export const createUserProfile = async (uid, displayName, email, bio = '') => {
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
    email: email.toLowerCase().trim(),
    bio: bio.trim(),
    profilePicUrl: '', // Empty until user uploads a picture
    createdAt: serverTimestamp()
  });

  console.log('✅ User profile created successfully with email:', email);
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
 * Updates user profile to add email if missing (for existing users)
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @param {string} email - User's email address
 * @returns {Promise<void>}
 */
export const ensureUserEmail = async (uid, email) => {
  if (!email) {
    console.log('⚠️ [ensureUserEmail] No email provided for uid:', uid);
    return;
  }
  
  console.log('📧 [ensureUserEmail] Checking email for user:', uid, 'email:', email);
  
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const userData = userSnap.data();
    console.log('📋 [ensureUserEmail] Current user data:', { uid, email: userData.email, displayName: userData.displayName });
    
    // Only update if email is missing
    if (!userData.email) {
      await updateDoc(userRef, {
        email: email.toLowerCase().trim()
      });
      console.log('✅ [ensureUserEmail] Email added to existing user profile:', email.toLowerCase().trim());
    } else {
      console.log('ℹ️ [ensureUserEmail] User already has email:', userData.email);
    }
  } else {
    console.warn('⚠️ [ensureUserEmail] User document does not exist for uid:', uid);
  }
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
 * Saves the meeting to both creator's and all participants' scheduledMeetings
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @param {Object} meetingData - Meeting details
 * @param {string} meetingData.title - Meeting title
 * @param {string} meetingData.description - Meeting description
 * @param {Date} meetingData.scheduledAt - When the meeting is scheduled
 * @param {number} meetingData.durationMinutes - Duration in minutes (5-480)
 * @param {Array<string>} meetingData.invitedEmails - List of participant emails
 * @param {string} meetingData.creatorEmail - Email of the meeting creator
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

  // Prepare meeting document data
  const meetingDoc = {
    title: meetingData.title.trim(),
    description: meetingData.description?.trim() || '',
    scheduledAt: Timestamp.fromDate(new Date(meetingData.scheduledAt)),
    durationMinutes: meetingData.durationMinutes,
    invitedEmails: meetingData.invitedEmails || [],
    creatorUid: uid,
    creatorEmail: meetingData.creatorEmail,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  // Save to creator's scheduledMeetings
  const creatorMeetingsRef = collection(db, 'users', uid, 'scheduledMeetings');
  const docRef = await addDoc(creatorMeetingsRef, meetingDoc);
  const meetingId = docRef.id;

  // Save to each participant's scheduledMeetings collection
  if (meetingData.invitedEmails && meetingData.invitedEmails.length > 0) {
    console.log('📧 [scheduleMeeting] Processing invited emails:', meetingData.invitedEmails);
    // Find UIDs for invited emails
    const usersRef = collection(db, 'users');
    
    for (const email of meetingData.invitedEmails) {
      try {
        const emailLowercase = email.toLowerCase().trim();
        console.log('🔍 [scheduleMeeting] Looking for user with email:', emailLowercase);
        
        const q = query(usersRef, where('email', '==', emailLowercase));
        const snapshot = await getDocs(q);
        
        console.log('📊 [scheduleMeeting] Query results for', emailLowercase, ':', snapshot.size, 'users found');
        
        if (!snapshot.empty) {
          const participantUid = snapshot.docs[0].id;
          const participantData = snapshot.docs[0].data();
          console.log('✅ [scheduleMeeting] Found participant:', participantUid, 'with email:', participantData.email);
          
          const participantMeetingsRef = collection(db, 'users', participantUid, 'scheduledMeetings');
          
          // Add sharedMeetingId to track the same meeting across users
          const participantMeetingRef = await addDoc(participantMeetingsRef, {
            ...meetingDoc,
            sharedMeetingId: meetingId, // Link to creator's meeting
            isParticipant: true // Flag to indicate this user is a participant, not creator
          });
          console.log('✅ [scheduleMeeting] Added meeting to participant collection. Doc ID:', participantMeetingRef.id);
        } else {
          console.warn('⚠️ [scheduleMeeting] No user found with email:', emailLowercase);
        }
      } catch (error) {
        console.error(`❌ [scheduleMeeting] Error adding meeting to participant ${email}:`, error);
      }
    }
  }

  console.log('✅ Meeting scheduled successfully for creator and all participants:', meetingId);
  return meetingId;
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
 * Deletes a scheduled meeting from all users (creator and participants)
 * 
 * @param {string} uid - The user's Firebase Auth UID (creator)
 * @param {string} meetingId - The meeting document ID
 * @returns {Promise<void>}
 */
export const deleteScheduledMeeting = async (uid, meetingId) => {
  // Get the meeting data first to find all participants
  const meetingRef = doc(db, 'users', uid, 'scheduledMeetings', meetingId);
  const meetingSnap = await getDoc(meetingRef);
  
  if (!meetingSnap.exists()) {
    console.warn('Meeting not found:', meetingId);
    return;
  }
  
  const meetingData = meetingSnap.data();
  
  // Delete from creator's collection
  await deleteDoc(meetingRef);
  
  // Delete from all participants' collections
  if (meetingData.invitedEmails && meetingData.invitedEmails.length > 0) {
    const usersRef = collection(db, 'users');
    
    for (const email of meetingData.invitedEmails) {
      try {
        const q = query(usersRef, where('email', '==', email));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const participantUid = snapshot.docs[0].id;
          const participantMeetingsRef = collection(db, 'users', participantUid, 'scheduledMeetings');
          
          // Find and delete the meeting with matching sharedMeetingId
          const participantQuery = query(participantMeetingsRef, where('sharedMeetingId', '==', meetingId));
          const participantSnapshot = await getDocs(participantQuery);
          
          participantSnapshot.docs.forEach(async (doc) => {
            await deleteDoc(doc.ref);
          });
        }
      } catch (error) {
        console.warn(`Could not delete meeting from participant ${email}:`, error);
      }
    }
  }
  
  console.log('✅ Meeting deleted successfully from all users');
};

/**
 * Gets all scheduled meetings for a user (both created and invited)
 * Also cleans up expired meetings
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @returns {Promise<Array>} - Array of scheduled meetings
 */
export const getScheduledMeetings = async (uid) => {
  console.log('📅 [getScheduledMeetings] Fetching scheduled meetings for user:', uid);
  
  // First cleanup expired meetings
  await cleanupExpiredScheduledMeetings(uid);
  
  const meetingsRef = collection(db, 'users', uid, 'scheduledMeetings');
  const q = query(meetingsRef, orderBy('scheduledAt', 'asc'));
  const snapshot = await getDocs(q);
  
  console.log('📊 [getScheduledMeetings] Found', snapshot.size, 'scheduled meetings');
  
  const meetings = snapshot.docs.map(doc => {
    const data = doc.data();
    console.log('📋 [getScheduledMeetings] Meeting:', {
      id: doc.id,
      title: data.title,
      isParticipant: data.isParticipant,
      creatorEmail: data.creatorEmail,
      scheduledAt: data.scheduledAt?.toDate?.()?.toLocaleString()
    });
    return {
      id: doc.id,
      ...data
    };
  });
  
  return meetings;
};

/**
 * Cleans up scheduled meetings that have already ended
 * A meeting is considered expired if: scheduledAt + durationMinutes < current time
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @returns {Promise<number>} - Number of deleted meetings
 */
export const cleanupExpiredScheduledMeetings = async (uid) => {
  const meetingsRef = collection(db, 'users', uid, 'scheduledMeetings');
  const snapshot = await getDocs(meetingsRef);
  
  const now = new Date();
  let deletedCount = 0;
  
  for (const docSnap of snapshot.docs) {
    const meeting = docSnap.data();
    const scheduledTime = meeting.scheduledAt.toDate();
    const endTime = new Date(scheduledTime.getTime() + meeting.durationMinutes * 60000);
    
    // If meeting has ended, delete it
    if (endTime < now) {
      // If this user is the creator, delete from all participants
      if (!meeting.isParticipant) {
        await deleteScheduledMeeting(uid, docSnap.id);
      } else {
        // If this user is just a participant, only delete from their collection
        await deleteDoc(docSnap.ref);
      }
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    console.log(`🗑️ Cleaned up ${deletedCount} expired scheduled meetings`);
  }
  
  return deletedCount;
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
  console.log('💾 [Firestore] Adding meeting to history for user:', uid);
  console.log('💾 [Firestore] History data:', historyData);
  
  try {
    const historyRef = collection(db, 'users', uid, 'meetingHistory');
    
    const docData = {
      title: historyData.title,
      startedAt: Timestamp.fromDate(new Date(historyData.startedAt)),
      endedAt: Timestamp.fromDate(new Date(historyData.endedAt)),
      participantsCount: historyData.participantsCount
    };
    
    console.log('💾 [Firestore] Document data to save:', docData);

    const docRef = await addDoc(historyRef, docData);

    console.log('✅ [Firestore] Meeting added to history successfully! Doc ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ [Firestore] Error adding meeting to history:', error);
    throw error;
  }
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

/**
 * Clears all meeting history for a user
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @returns {Promise<void>}
 */
export const clearMeetingHistory = async (uid) => {
  const historyRef = collection(db, 'users', uid, 'meetingHistory');
  const snapshot = await getDocs(historyRef);
  
  // Delete all documents in batches
  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log('✅ Meeting history cleared successfully');
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
 * @param {boolean} meetingData.isProctoredMode - Enable proctored assessment mode
 * @param {number} meetingData.maxAttempts - Maximum attempts per participant (default: 1)
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
    isProctoredMode: meetingData.isProctoredMode || false,
    maxAttempts: meetingData.maxAttempts || 1,
    createdAt: serverTimestamp(),
    participants: [] // Will store joined participants
  };

  await setDoc(meetingRef, meeting);
  console.log('✅ Instant meeting created:', meetingId, 
    meetingData.isProctoredMode ? `(Proctored Mode: ${meetingData.maxAttempts} attempts)` : '');
  
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
 * Also checks assessments collection for proctored assessments
 * 
 * @param {string} meetingId - The meeting ID (or assessment ID)
 * @param {string} userEmail - The user's email attempting to join
 * @param {string} userId - The user's Firebase UID (optional, for assessments)
 * @returns {Promise<Object>} - { isAllowed: boolean, reason: string, meeting: Object|null }
 */
export const validateMeetingParticipant = async (meetingId, userEmail, userId = null) => {
  // First, try to get from meetings collection
  let meeting = await getMeetingById(meetingId);
  
  // If not found in meetings, check assessments collection (for proctored mode)
  if (!meeting) {
    try {
      const assessmentData = await getAssessment(meetingId);
      
      if (assessmentData) {
        // Convert assessment to meeting format
        meeting = {
          id: assessmentData.id,
          ...assessmentData,
          creatorEmail: assessmentData.creatorEmail || '', // May not exist
          invitedEmails: assessmentData.allowedParticipants || [], // Assessments use allowedParticipants
          isProctoredMode: true
        };
      }
    } catch (error) {
      console.error('Error checking assessments:', error);
    }
  }
  
  if (!meeting) {
    return {
      isAllowed: false,
      reason: 'Assessment not found',
      meeting: null
    };
  }

  // Normalize email for comparison
  const normalizedUserEmail = userEmail.toLowerCase().trim();
  const normalizedCreatorEmail = meeting.creatorEmail?.toLowerCase().trim();
  const normalizedInvitedEmails = (meeting.invitedEmails || []).map(e => e.toLowerCase().trim());

  // Check if user is the creator (by UID for assessments, by email for meetings)
  if (userId && meeting.createdBy && userId === meeting.createdBy) {
    return {
      isAllowed: true,
      reason: 'You are the assessment host.',
      meeting,
      isHost: true
    };
  }
  
  // Check by email
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
 * @param {string} meetingId - The meeting ID (or assessment ID)
 * @param {Object} participant - Participant details
 * @param {string} participant.uid - Participant's user ID
 * @param {string} participant.email - Participant's email
 * @param {string} participant.displayName - Participant's display name
 * @param {string} participant.profilePicUrl - Participant's profile picture URL
 * @returns {Promise<void>}
 */
export const addParticipantToMeeting = async (meetingId, participant) => {
  // First, try meetings collection
  const meetingRef = doc(db, 'meetings', meetingId);
  const meetingSnap = await getDoc(meetingRef);
  
  if (meetingSnap.exists()) {
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
    return;
  }
  
  // If not found in meetings, try assessments collection
  const assessmentRef = doc(db, 'assessments', meetingId);
  const assessmentSnap = await getDoc(assessmentRef);
  
  if (assessmentSnap.exists()) {
    // For assessments, participants are tracked via attempts subcollection
    // We can optionally update a participants array here too
    const currentParticipants = assessmentSnap.data().participants || [];
    
    // Check if participant already exists
    const existingIndex = currentParticipants.findIndex(p => p.uid === participant.uid);
    
    if (existingIndex === -1) {
      currentParticipants.push({
        uid: participant.uid,
        email: participant.email,
        displayName: participant.displayName || 'Anonymous',
        profilePicUrl: participant.profilePicUrl || '',
        joinedAt: new Date().toISOString()
      });
      
      await updateDoc(assessmentRef, { participants: currentParticipants });
      console.log('✅ Participant added to assessment:', participant.email);
    }
    return;
  }
  
  // If neither exists, log warning but don't throw error
  // This allows the room to work even if we can't track participants
  console.warn('⚠️ Meeting/Assessment not found for participant tracking:', meetingId);
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

// ============================================================
// REAL-TIME CHAT AND POLLS FOR VIDEO MEETINGS
// ============================================================

/**
 * Send a chat message to a meeting room
 * 
 * @param {string} roomId - The meeting room ID
 * @param {Object} message - Message object
 * @returns {Promise<void>}
 */
export const sendChatMessage = async (roomId, message) => {
  const messagesRef = collection(db, 'meetings', roomId, 'messages');
  await addDoc(messagesRef, {
    ...message,
    createdAt: serverTimestamp()
  });
};

/**
 * Delete a chat message
 * 
 * @param {string} roomId - The meeting room ID
 * @param {string} messageId - The message document ID
 * @returns {Promise<void>}
 */
export const deleteChatMessage = async (roomId, messageId) => {
  const messageRef = doc(db, 'meetings', roomId, 'messages', messageId);
  await deleteDoc(messageRef);
};

/**
 * Subscribe to real-time chat messages
 * 
 * @param {string} roomId - The meeting room ID
 * @param {Function} callback - Callback function that receives messages array
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToChatMessages = (roomId, callback) => {
  const messagesRef = collection(db, 'meetings', roomId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      firestoreId: doc.id,
      ...doc.data()
    }));
    callback(messages);
  });
};

/**
 * Create a poll in a meeting room
 * 
 * @param {string} roomId - The meeting room ID
 * @param {Object} poll - Poll object
 * @returns {Promise<void>}
 */
export const createPollInMeeting = async (roomId, poll) => {
  const pollsRef = collection(db, 'meetings', roomId, 'polls');
  await addDoc(pollsRef, {
    ...poll,
    createdAt: serverTimestamp()
  });
};

/**
 * Delete a poll
 * 
 * @param {string} roomId - The meeting room ID
 * @param {string} pollId - The poll document ID
 * @returns {Promise<void>}
 */
export const deletePollFromMeeting = async (roomId, pollId) => {
  const pollRef = doc(db, 'meetings', roomId, 'polls', pollId);
  await deleteDoc(pollRef);
};

/**
 * Vote on a poll
 * 
 * @param {string} roomId - The meeting room ID
 * @param {string} pollId - The poll document ID
 * @param {number} optionId - The option ID to vote for
 * @param {string} userName - The voter's name
 * @param {number} previousVote - Previous vote option ID (if changing vote)
 * @returns {Promise<void>}
 */
export const votePollInMeeting = async (roomId, pollId, optionId, userName, previousVote) => {
  const pollRef = doc(db, 'meetings', roomId, 'polls', pollId);
  const pollSnap = await getDoc(pollRef);
  
  if (!pollSnap.exists()) {
    throw new Error('Poll not found');
  }
  
  const poll = pollSnap.data();
  
  // Remove previous vote if exists
  if (previousVote !== undefined) {
    const previousOption = poll.options.find(opt => opt.id === previousVote);
    if (previousOption && previousOption.voters.includes(userName)) {
      previousOption.votes = Math.max(0, previousOption.votes - 1);
      previousOption.voters = previousOption.voters.filter(v => v !== userName);
    }
  } else {
    // Remove vote from any option if user voted elsewhere
    poll.options.forEach(opt => {
      if (opt.voters.includes(userName)) {
        opt.votes = Math.max(0, opt.votes - 1);
        opt.voters = opt.voters.filter(v => v !== userName);
      }
    });
  }
  
  // Add new vote
  const newOption = poll.options.find(opt => opt.id === optionId);
  if (newOption && !newOption.voters.includes(userName)) {
    newOption.votes += 1;
    newOption.voters.push(userName);
  }
  
  await updateDoc(pollRef, { options: poll.options });
};

/**
 * Subscribe to real-time polls
 * 
 * @param {string} roomId - The meeting room ID
 * @param {Function} callback - Callback function that receives polls array
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToPolls = (roomId, callback) => {
  const pollsRef = collection(db, 'meetings', roomId, 'polls');
  const q = query(pollsRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const polls = snapshot.docs.map(doc => ({
      firestoreId: doc.id,
      ...doc.data()
    }));
    callback(polls);
  });
};

/**
 * Delete all chat messages, polls, and captions for a meeting (when meeting ends)
 * 
 * @param {string} roomId - The meeting room ID
 * @returns {Promise<void>}
 */
export const cleanupMeetingChat = async (roomId) => {
  const batch = writeBatch(db);
  
  // Delete all messages
  const messagesRef = collection(db, 'meetings', roomId, 'messages');
  const messagesSnapshot = await getDocs(messagesRef);
  messagesSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Delete all polls
  const pollsRef = collection(db, 'meetings', roomId, 'polls');
  const pollsSnapshot = await getDocs(pollsRef);
  pollsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Delete all captions
  const captionsRef = collection(db, 'meetings', roomId, 'captions');
  const captionsSnapshot = await getDocs(captionsRef);
  captionsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log('✅ Meeting chat, polls, and captions cleaned up');
};
// ============================================================
// STATISTICS FUNCTIONS (Real-time Meeting Stats)
// ============================================================

/**
 * Get real-time statistics for user's meetings
 * Returns total meetings count, total participants, and total meeting hours
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @returns {Promise<Object>} - Object with totalMeetings, totalParticipants, totalHours
 */
export const getMeetingStatistics = async (uid) => {
  try {
    // Get all meeting history
    const historyRef = collection(db, 'users', uid, 'meetingHistory');
    const snapshot = await getDocs(historyRef);
    
    let totalMeetings = 0;
    let totalParticipants = 0;
    let totalMinutes = 0;
    
    snapshot.docs.forEach(doc => {
      const meeting = doc.data();
      totalMeetings++;
      
      // Count participants
      if (meeting.participantsCount) {
        totalParticipants += meeting.participantsCount;
      } else {
        totalParticipants += 1; // At least the host
      }
      
      // Calculate duration in minutes
      if (meeting.startedAt && meeting.endedAt) {
        const start = meeting.startedAt.toDate ? meeting.startedAt.toDate() : new Date(meeting.startedAt);
        const end = meeting.endedAt.toDate ? meeting.endedAt.toDate() : new Date(meeting.endedAt);
        const durationMs = end - start;
        const minutes = Math.round(durationMs / 60000);
        totalMinutes += minutes;
      }
    });
    
    // Convert minutes to hours with one decimal
    const totalHours = (totalMinutes / 60).toFixed(1);
    
    return {
      totalMeetings,
      totalParticipants,
      totalHours: parseFloat(totalHours)
    };
  } catch (error) {
    console.error('Error fetching meeting statistics:', error);
    return {
      totalMeetings: 0,
      totalParticipants: 0,
      totalHours: 0
    };
  }
};

/**
 * Subscribe to real-time statistics updates
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @param {Function} callback - Callback function to receive stats updates
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToMeetingStatistics = (uid, callback) => {
  const historyRef = collection(db, 'users', uid, 'meetingHistory');
  
  return onSnapshot(historyRef, async (snapshot) => {
    let totalMeetings = 0;
    let totalParticipants = 0;
    let totalMinutes = 0;
    
    snapshot.docs.forEach(doc => {
      const meeting = doc.data();
      totalMeetings++;
      
      // Count participants
      if (meeting.participantsCount) {
        totalParticipants += meeting.participantsCount;
      } else {
        totalParticipants += 1;
      }
      
      // Calculate duration
      if (meeting.startedAt && meeting.endedAt) {
        const start = meeting.startedAt.toDate ? meeting.startedAt.toDate() : new Date(meeting.startedAt);
        const end = meeting.endedAt.toDate ? meeting.endedAt.toDate() : new Date(meeting.endedAt);
        const durationMs = end - start;
        const minutes = Math.round(durationMs / 60000);
        totalMinutes += minutes;
      }
    });
    
    const totalHours = (totalMinutes / 60).toFixed(1);
    
    callback({
      totalMeetings,
      totalParticipants,
      totalHours: parseFloat(totalHours)
    });
  });
};

// ============================================================
// PROCTORED ASSESSMENT FUNCTIONS
// ============================================================

/**
 * Helper function to determine if a meeting ID is an assessment or meeting
 * @param {string} meetingId - The ID to check
 * @returns {Promise<{isAssessment: boolean, data: Object|null}>}
 */
const getMeetingOrAssessment = async (meetingId) => {
  // First try assessments
  try {
    const assessmentData = await getAssessment(meetingId);
    if (assessmentData) {
      return { isAssessment: true, data: assessmentData };
    }
  } catch (error) {
    // Not an assessment, continue
  }
  
  // Try meetings
  const meeting = await getMeetingById(meetingId);
  if (meeting) {
    return { isAssessment: false, data: meeting };
  }
  
  return { isAssessment: false, data: null };
};

/**
 * Track assessment attempt for a participant
 * Records when a participant joins an assessment
 * 
 * @param {string} meetingId - The meeting/assessment ID
 * @param {string} userEmail - The participant's email
 * @param {string} userId - The participant's user ID
 * @returns {Promise<Object>} - { allowed: boolean, attemptCount: number, maxAttempts: number }
 */
export const trackAssessmentAttempt = async (meetingId, userEmail, userId) => {
  try {
    // Determine if this is an assessment or meeting
    const { isAssessment, data } = await getMeetingOrAssessment(meetingId);
    
    if (!data) {
      throw new Error('Meeting/Assessment not found');
    }
    
    const meeting = data;
    
    // Check if proctored mode is enabled
    if (!meeting.isProctoredMode) {
      return { allowed: true, attemptCount: 0, maxAttempts: 0 };
    }
    
    // Get attempt tracking data from the correct collection
    const collectionPath = isAssessment ? 'assessments' : 'meetings';
    const attemptsRef = collection(db, collectionPath, meetingId, 'attempts');
    const normalizedEmail = userEmail.toLowerCase().trim();
    
    // Query for existing attempts by this user
    const q = query(attemptsRef, where('userEmail', '==', normalizedEmail));
    const snapshot = await getDocs(q);
    
    const attemptCount = snapshot.size;
    const maxAttempts = meeting.maxAttempts || 1;
    
    // Check if user has exceeded attempts
    if (attemptCount >= maxAttempts) {
      return { 
        allowed: false, 
        attemptCount, 
        maxAttempts,
        message: 'Maximum attempts reached. You cannot rejoin this assessment.'
      };
    }
    
    // Record new attempt
    await addDoc(attemptsRef, {
      userEmail: normalizedEmail,
      userId,
      attemptNumber: attemptCount + 1,
      joinedAt: serverTimestamp(),
      completedAt: null,
      status: 'in-progress', // in-progress, completed, disconnected
      device: {
        userAgent: navigator.userAgent,
        platform: navigator.platform
      }
    });
    
    console.log(`✅ Attempt ${attemptCount + 1} recorded for ${userEmail} in assessment ${meetingId}`);
    
    return { 
      allowed: true, 
      attemptCount: attemptCount + 1, 
      maxAttempts 
    };
  } catch (error) {
    console.error('Error tracking assessment attempt:', error);
    throw error;
  }
};

/**
 * Update attempt status (completed or disconnected)
 * 
 * @param {string} meetingId - The meeting/assessment ID
 * @param {string} userEmail - The participant's email
 * @param {string} status - New status ('completed' or 'disconnected')
 * @returns {Promise<void>}
 */
export const updateAttemptStatus = async (meetingId, userEmail, status) => {
  try {
    // Determine if this is an assessment or meeting
    const { isAssessment } = await getMeetingOrAssessment(meetingId);
    const collectionPath = isAssessment ? 'assessments' : 'meetings';
    
    const attemptsRef = collection(db, collectionPath, meetingId, 'attempts');
    const normalizedEmail = userEmail.toLowerCase().trim();
    
    // Find the latest in-progress attempt
    const q = query(
      attemptsRef, 
      where('userEmail', '==', normalizedEmail),
      where('status', '==', 'in-progress'),
      orderBy('joinedAt', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const attemptDoc = snapshot.docs[0];
      await updateDoc(attemptDoc.ref, {
        status,
        completedAt: serverTimestamp()
      });
      console.log(`✅ Attempt marked as ${status} for ${userEmail}`);
    }
  } catch (error) {
    console.error('Error updating attempt status:', error);
  }
};

/**
 * Get attempt history for a specific assessment
 * Only accessible by the meeting creator
 * 
 * @param {string} meetingId - The meeting/assessment ID
 * @returns {Promise<Array>} - Array of attempt records
 */
export const getAssessmentAttemptHistory = async (meetingId) => {
  try {
    // Determine if this is an assessment or meeting
    const { isAssessment } = await getMeetingOrAssessment(meetingId);
    const collectionPath = isAssessment ? 'assessments' : 'meetings';
    
    const attemptsRef = collection(db, collectionPath, meetingId, 'attempts');
    const q = query(attemptsRef, orderBy('joinedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching attempt history:', error);
    return [];
  }
};

/**
 * Check if a participant can join an assessment (without recording attempt)
 * 
 * @param {string} meetingId - The meeting/assessment ID
 * @param {string} userEmail - The participant's email
 * @returns {Promise<Object>} - { allowed: boolean, attemptCount: number, maxAttempts: number }
 */
export const checkAssessmentAccess = async (meetingId, userEmail) => {
  try {
    // Determine if this is an assessment or meeting
    const { isAssessment, data } = await getMeetingOrAssessment(meetingId);
    
    if (!data) {
      return { allowed: false, message: 'Assessment not found' };
    }
    
    const meeting = data;
    
    // Check if proctored mode is enabled
    if (!meeting.isProctoredMode) {
      return { allowed: true, attemptCount: 0, maxAttempts: 0 };
    }
    
    // Get attempt count from the correct collection
    const collectionPath = isAssessment ? 'assessments' : 'meetings';
    const attemptsRef = collection(db, collectionPath, meetingId, 'attempts');
    const normalizedEmail = userEmail.toLowerCase().trim();
    const q = query(attemptsRef, where('userEmail', '==', normalizedEmail));
    const snapshot = await getDocs(q);
    
    const attemptCount = snapshot.size;
    const maxAttempts = meeting.maxAttempts || 1;
    
    if (attemptCount >= maxAttempts) {
      return { 
        allowed: false, 
        attemptCount, 
        maxAttempts,
        message: `You have already used all ${maxAttempts} attempt(s) for this assessment.`
      };
    }
    
    return { 
      allowed: true, 
      attemptCount, 
      maxAttempts,
      remainingAttempts: maxAttempts - attemptCount
    };
  } catch (error) {
    console.error('Error checking assessment access:', error);
    throw error;
  }
};

/**
 * Prevent multiple device login during same assessment
 * 
 * @param {string} meetingId - The meeting/assessment ID
 * @param {string} userEmail - The participant's email
 * @returns {Promise<boolean>} - true if another session exists
 */
export const checkActiveSession = async (meetingId, userEmail) => {
  // Note: This function may have permission issues if Firestore rules don't allow
  // reading attempt subcollections. In such cases, we return false (no restriction)
  
  try {
    const normalizedEmail = userEmail.toLowerCase().trim();
    
    // First, try to check in assessments collection (for proctored assessments)
    try {
      const assessmentAttemptsRef = collection(db, 'assessments', meetingId, 'attempts');
      const assessmentQuery = query(
        assessmentAttemptsRef,
        where('userEmail', '==', normalizedEmail),
        where('status', '==', 'in-progress')
      );
      const assessmentSnapshot = await getDocs(assessmentQuery);
      
      if (!assessmentSnapshot.empty) {
        console.log('✅ Found active session in assessments collection');
        return true;
      }
    } catch (assessmentError) {
      // Permission error or assessment doesn't exist
      // If it's a permission error, we can't enforce this check
      if (assessmentError.code === 'permission-denied') {
        console.warn('⚠️ Cannot check active sessions due to Firestore permissions - skipping check');
        return false; // Allow user to proceed
      }
    }
    
    // If not found in assessments, check meetings collection
    try {
      const meetingAttemptsRef = collection(db, 'meetings', meetingId, 'attempts');
      const meetingQuery = query(
        meetingAttemptsRef,
        where('userEmail', '==', normalizedEmail),
        where('status', '==', 'in-progress')
      );
      const meetingSnapshot = await getDocs(meetingQuery);
      
      if (!meetingSnapshot.empty) {
        console.log('✅ Found active session in meetings collection');
        return true;
      }
    } catch (meetingError) {
      // Permission error or meeting doesn't exist
      if (meetingError.code === 'permission-denied') {
        console.warn('⚠️ Cannot check active sessions due to Firestore permissions - skipping check');
        return false; // Allow user to proceed
      }
    }
    
    return false; // No active session found
  } catch (error) {
    console.error('Error checking active session:', error);
    // On any error, allow user to proceed (fail open)
    return false;
  }
};
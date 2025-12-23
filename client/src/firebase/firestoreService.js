// src/firebase/firestoreService.js
// Firestore service functions for user profiles, scheduled meetings, and meeting history

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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';

// ============================================================
// CONSTANTS
// ============================================================

const MAX_SCHEDULED_MEETINGS = 4;
const HISTORY_RETENTION_DAYS = 15;

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
 * Uploads a profile picture and updates the user's profilePicUrl
 * 
 * @param {string} uid - The user's Firebase Auth UID
 * @param {File} imageFile - The image file to upload
 * @returns {Promise<string>} - The download URL of the uploaded image
 */
export const uploadProfilePicture = async (uid, imageFile) => {
  // Validate file type
  if (!imageFile.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 1MB)
  if (imageFile.size > 1 * 1024 * 1024) {
    throw new Error('Image must be less than 1MB');
  }

  // Create storage reference
  const storageRef = ref(storage, `profilePictures/${uid}.jpg`);

  // Upload the file
  await uploadBytes(storageRef, imageFile);

  // Get the download URL
  const downloadUrl = await getDownloadURL(storageRef);

  // Update the user's profile with the new URL
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { profilePicUrl: downloadUrl });

  console.log('✅ Profile picture uploaded successfully');
  return downloadUrl;
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

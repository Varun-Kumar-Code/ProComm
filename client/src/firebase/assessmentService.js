// src/firebase/assessmentService.js
// Firestore service functions for Assessment Mode with live proctoring

import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  onSnapshot,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { db } from './config';

// ============================================================
// ASSESSMENT FUNCTIONS
// ============================================================

/**
 * Create a new assessment
 * @param {Object} assessmentData - Assessment data
 * @returns {Promise<string>} - Assessment ID
 */
export const createAssessment = async (assessmentData) => {
  try {
    // Calculate expiration time: scheduledStartTime + duration + 7 days buffer
    // Or if no schedule: createdAt + 30 days default
    let expiresAt = null;
    if (assessmentData.scheduledStartTime) {
      const scheduleTime = assessmentData.scheduledStartTime.toDate ? 
        assessmentData.scheduledStartTime.toDate() : 
        new Date(assessmentData.scheduledStartTime);
      const durationMs = assessmentData.durationMinutes * 60 * 1000;
      const bufferMs = 7 * 24 * 60 * 60 * 1000; // 7 days buffer
      expiresAt = new Date(scheduleTime.getTime() + durationMs + bufferMs);
    } else {
      // Default: expires 30 days after creation
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    
    const assessmentRef = await addDoc(collection(db, 'assessments'), {
      title: assessmentData.title,
      description: assessmentData.description || '',
      durationMinutes: assessmentData.durationMinutes,
      allowedParticipants: assessmentData.allowedParticipants || [], // Array of emails
      scheduledStartTime: assessmentData.scheduledStartTime || null,
      autoStartMeeting: assessmentData.autoStartMeeting || false,
      questions: assessmentData.questions || [],
      shuffleQuestions: assessmentData.shuffleQuestions || false,
      shuffleOptions: assessmentData.shuffleOptions || false,
      negativeMarking: assessmentData.negativeMarking || false,
      negativeMarkingValue: assessmentData.negativeMarkingValue || 0,
      isProctoredMode: assessmentData.isProctoredMode || false,
      maxAttempts: assessmentData.maxAttempts || 1,
      linkedProctorSessionId: null,
      isPublished: false,
      isDraft: true,
      createdBy: assessmentData.createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt: expiresAt // Auto-deletion timestamp
    });

    console.log('✅ Assessment created with ID:', assessmentRef.id);
    return assessmentRef.id;
  } catch (error) {
    console.error('❌ Error creating assessment:', error);
    throw error;
  }
};

/**
 * Get assessment by ID
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise<Object>} - Assessment data
 */
export const getAssessment = async (assessmentId) => {
  try {
    const assessmentRef = doc(db, 'assessments', assessmentId);
    const assessmentSnap = await getDoc(assessmentRef);

    if (!assessmentSnap.exists()) {
      throw new Error('Assessment not found');
    }

    return {
      id: assessmentSnap.id,
      ...assessmentSnap.data()
    };
  } catch (error) {
    console.error('❌ Error getting assessment:', error);
    throw error;
  }
};

/**
 * Update assessment
 * @param {string} assessmentId - Assessment ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateAssessment = async (assessmentId, updates) => {
  try {
    const assessmentRef = doc(db, 'assessments', assessmentId);
    await updateDoc(assessmentRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Assessment updated successfully');
  } catch (error) {
    console.error('❌ Error updating assessment:', error);
    throw error;
  }
};

/**
 * Publish assessment (make it visible to participants)
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise<void>}
 */
export const publishAssessment = async (assessmentId) => {
  try {
    const assessmentRef = doc(db, 'assessments', assessmentId);
    await updateDoc(assessmentRef, {
      isPublished: true,
      isDraft: false,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Assessment published successfully');
  } catch (error) {
    console.error('❌ Error publishing assessment:', error);
    throw error;
  }
};

/**
 * Delete assessment
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise<void>}
 */
export const deleteAssessment = async (assessmentId) => {
  try {
    const assessmentRef = doc(db, 'assessments', assessmentId);
    await deleteDoc(assessmentRef);

    console.log('✅ Assessment deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting assessment:', error);
    throw error;
  }
};

/**
 * Get all assessments created by a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of assessments
 */
export const getMyAssessments = async (userId) => {
  try {
    const q = query(
      collection(db, 'assessments'),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const assessments = [];

    querySnapshot.forEach((doc) => {
      assessments.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return assessments;
  } catch (error) {
    console.error('❌ Error getting my assessments:', error);
    throw error;
  }
};

/**
 * Get assessments assigned to a user (by email)
 * @param {string} userEmail - User email
 * @returns {Promise<Array>} - Array of assessments
 */
export const getAssignedAssessments = async (userEmail) => {
  try {
    const q = query(
      collection(db, 'assessments'),
      where('allowedParticipants', 'array-contains', userEmail),
      where('isPublished', '==', true)
    );

    const querySnapshot = await getDocs(q);
    const assessments = [];

    querySnapshot.forEach((doc) => {
      assessments.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return assessments;
  } catch (error) {
    console.error('❌ Error getting assigned assessments:', error);
    throw error;
  }
};

// ============================================================
// ASSESSMENT ATTEMPT FUNCTIONS
// ============================================================

/**
 * Create a new assessment attempt
 * @param {Object} attemptData - Attempt data
 * @returns {Promise<string>} - Attempt ID
 */
export const createAttempt = async (attemptData) => {
  try {
    const attemptRef = await addDoc(collection(db, 'attempts'), {
      assessmentId: attemptData.assessmentId,
      userId: attemptData.userId,
      userEmail: attemptData.userEmail,
      userName: attemptData.userName,
      answers: [],
      score: null,
      violations: 0,
      violationLog: [],
      startedAt: serverTimestamp(),
      submittedAt: null,
      status: 'in-progress', // in-progress, submitted, auto-submitted
      proctorSessionId: attemptData.proctorSessionId || null
    });

    console.log('✅ Attempt created with ID:', attemptRef.id);
    return attemptRef.id;
  } catch (error) {
    console.error('❌ Error creating attempt:', error);
    throw error;
  }
};

/**
 * Get attempt by ID
 * @param {string} attemptId - Attempt ID
 * @returns {Promise<Object>} - Attempt data
 */
export const getAttempt = async (attemptId) => {
  try {
    const attemptRef = doc(db, 'attempts', attemptId);
    const attemptSnap = await getDoc(attemptRef);

    if (!attemptSnap.exists()) {
      throw new Error('Attempt not found');
    }

    return {
      id: attemptSnap.id,
      ...attemptSnap.data()
    };
  } catch (error) {
    console.error('❌ Error getting attempt:', error);
    throw error;
  }
};

/**
 * Update attempt (save answers)
 * @param {string} attemptId - Attempt ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateAttempt = async (attemptId, updates) => {
  try {
    const attemptRef = doc(db, 'attempts', attemptId);
    await updateDoc(attemptRef, updates);

    console.log('✅ Attempt updated successfully');
  } catch (error) {
    console.error('❌ Error updating attempt:', error);
    throw error;
  }
};

/**
 * Log a violation
 * @param {string} attemptId - Attempt ID
 * @param {string} violationType - Type of violation
 * @returns {Promise<void>}
 */
export const logViolation = async (attemptId, violationType) => {
  try {
    const attemptRef = doc(db, 'attempts', attemptId);
    await updateDoc(attemptRef, {
      violations: increment(1),
      violationLog: arrayUnion({
        type: violationType,
        timestamp: new Date().toISOString()
      })
    });

    console.log('⚠️ Violation logged:', violationType);
  } catch (error) {
    console.error('❌ Error logging violation:', error);
    throw error;
  }
};

/**
 * Submit attempt
 * @param {string} attemptId - Attempt ID
 * @param {Array} answers - User answers
 * @param {number} score - Calculated score
 * @param {string} status - Submission status
 * @returns {Promise<void>}
 */
export const submitAttempt = async (attemptId, answers, score, status = 'submitted') => {
  try {
    const attemptRef = doc(db, 'attempts', attemptId);
    await updateDoc(attemptRef, {
      answers,
      score,
      submittedAt: serverTimestamp(),
      status
    });

    console.log('✅ Attempt submitted successfully');
  } catch (error) {
    console.error('❌ Error submitting attempt:', error);
    throw error;
  }
};

/**
 * Get all attempts for an assessment (for host)
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise<Array>} - Array of attempts
 */
export const getAssessmentAttempts = async (assessmentId) => {
  try {
    const q = query(
      collection(db, 'attempts'),
      where('assessmentId', '==', assessmentId),
      orderBy('startedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const attempts = [];

    querySnapshot.forEach((doc) => {
      attempts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return attempts;
  } catch (error) {
    console.error('❌ Error getting assessment attempts:', error);
    throw error;
  }
};

/**
 * Get user's attempts for an assessment
 * @param {string} userId - User ID
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise<Array>} - Array of attempts
 */
export const getUserAttempts = async (userId, assessmentId) => {
  try {
    const q = query(
      collection(db, 'attempts'),
      where('userId', '==', userId),
      where('assessmentId', '==', assessmentId)
    );

    const querySnapshot = await getDocs(q);
    const attempts = [];

    querySnapshot.forEach((doc) => {
      attempts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return attempts;
  } catch (error) {
    console.error('❌ Error getting user attempts:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time attempt updates
 * @param {string} attemptId - Attempt ID
 * @param {Function} callback - Callback function
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToAttempt = (attemptId, callback) => {
  const attemptRef = doc(db, 'attempts', attemptId);
  return onSnapshot(attemptRef, (doc) => {
    if (doc.exists()) {
      callback({
        id: doc.id,
        ...doc.data()
      });
    }
  });
};

// ============================================================
// PROCTOR SESSION FUNCTIONS
// ============================================================

/**
 * Create a proctor session for an assessment
 * @param {Object} sessionData - Session data
 * @returns {Promise<string>} - Session ID
 */
export const createProctorSession = async (sessionData) => {
  try {
    const sessionRef = await addDoc(collection(db, 'proctorSessions'), {
      assessmentId: sessionData.assessmentId,
      hostId: sessionData.hostId,
      participants: [],
      status: 'active',
      createdAt: serverTimestamp()
    });

    // Update assessment with linked proctor session
    const assessmentRef = doc(db, 'assessments', sessionData.assessmentId);
    await updateDoc(assessmentRef, {
      linkedProctorSessionId: sessionRef.id
    });

    console.log('✅ Proctor session created with ID:', sessionRef.id);
    return sessionRef.id;
  } catch (error) {
    console.error('❌ Error creating proctor session:', error);
    throw error;
  }
};

/**
 * Get proctor session by ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - Session data
 */
export const getProctorSession = async (sessionId) => {
  try {
    const sessionRef = doc(db, 'proctorSessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error('Proctor session not found');
    }

    return {
      id: sessionSnap.id,
      ...sessionSnap.data()
    };
  } catch (error) {
    console.error('❌ Error getting proctor session:', error);
    throw error;
  }
};

/**
 * Add participant to proctor session
 * @param {string} sessionId - Session ID
 * @param {Object} participantData - Participant data
 * @returns {Promise<void>}
 */
export const addParticipantToProctorSession = async (sessionId, participantData) => {
  try {
    const sessionRef = doc(db, 'proctorSessions', sessionId);
    await updateDoc(sessionRef, {
      participants: arrayUnion({
        userId: participantData.userId,
        userName: participantData.userName,
        userEmail: participantData.userEmail,
        peerId: participantData.peerId,
        joinedAt: new Date().toISOString()
      })
    });

    console.log('✅ Participant added to proctor session');
  } catch (error) {
    console.error('❌ Error adding participant to proctor session:', error);
    throw error;
  }
};

/**
 * Subscribe to proctor session updates
 * @param {string} sessionId - Session ID
 * @param {Function} callback - Callback function
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToProctorSession = (sessionId, callback) => {
  const sessionRef = doc(db, 'proctorSessions', sessionId);
  return onSnapshot(sessionRef, (doc) => {
    if (doc.exists()) {
      callback({
        id: doc.id,
        ...doc.data()
      });
    }
  });
};

/**
 * End proctor session
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
export const endProctorSession = async (sessionId) => {
  try {
    const sessionRef = doc(db, 'proctorSessions', sessionId);
    await updateDoc(sessionRef, {
      status: 'ended',
      endedAt: serverTimestamp()
    });

    console.log('✅ Proctor session ended');
  } catch (error) {
    console.error('❌ Error ending proctor session:', error);
    throw error;
  }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Calculate score for an attempt
 * @param {Array} questions - Assessment questions
 * @param {Array} answers - User answers
 * @param {boolean} negativeMarking - Whether negative marking is enabled
 * @param {number} negativeMarkingValue - Value for negative marking
 * @returns {number} - Calculated score
 */
export const calculateScore = (questions, answers, negativeMarking = false, negativeMarkingValue = 0) => {
  let score = 0;

  questions.forEach((question, index) => {
    const userAnswer = answers[index];
    
    if (!userAnswer || !userAnswer.answer) {
      return; // Skip unanswered questions
    }

    if (question.type === 'mcq') {
      if (userAnswer.answer === question.correctAnswer) {
        score += question.marks || 1;
      } else if (negativeMarking) {
        score -= negativeMarkingValue;
      }
    } else if (question.type === 'checkbox') {
      const correctAnswers = question.correctAnswers || [];
      const userAnswers = userAnswer.answer || [];
      
      // Check if arrays are equal (order doesn't matter)
      const isCorrect = correctAnswers.length === userAnswers.length &&
                        correctAnswers.every(ans => userAnswers.includes(ans));
      
      if (isCorrect) {
        score += question.marks || 1;
      } else if (negativeMarking) {
        score -= negativeMarkingValue;
      }
    }
    // Short answer and paragraph questions need manual evaluation
  });

  return Math.max(0, score); // Ensure score is not negative
};

/**
 * Delete expired assessments and their related data
 * This should be called periodically (e.g., when dashboard loads)
 * For production, use Firebase Cloud Functions with scheduled triggers
 * @returns {Promise<number>} - Number of deleted assessments
 */
export const cleanupExpiredAssessments = async () => {
  try {
    const now = new Date();
    const q = query(
      collection(db, 'assessments'),
      where('expiresAt', '<', now)
    );

    const querySnapshot = await getDocs(q);
    let deletedCount = 0;

    for (const docSnapshot of querySnapshot.docs) {
      const assessmentId = docSnapshot.id;
      
      // Delete all attempts for this assessment
      const attemptsQuery = query(
        collection(db, 'attempts'),
        where('assessmentId', '==', assessmentId)
      );
      const attemptsSnapshot = await getDocs(attemptsQuery);
      
      for (const attemptDoc of attemptsSnapshot.docs) {
        await deleteDoc(doc(db, 'attempts', attemptDoc.id));
      }
      
      // Delete the assessment
      await deleteDoc(doc(db, 'assessments', assessmentId));
      deletedCount++;
    }

    if (deletedCount > 0) {
      console.log(`🗑️ Cleaned up ${deletedCount} expired assessments`);
    }

    return deletedCount;
  } catch (error) {
    console.error('❌ Error cleaning up expired assessments:', error);
    return 0;
  }
};

/**
 * Shuffle array (for questions or options)
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

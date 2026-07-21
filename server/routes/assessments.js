// server/routes/assessments.js
// Backend API routes for Assessment Mode

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

// Middleware to verify Firebase JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
    
    next();
  } catch (error) {
    console.error('❌ Token verification error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// ============================================================
// ASSESSMENT ROUTES
// ============================================================

/**
 * Create a new assessment
 * POST /api/assessments
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      durationMinutes,
      allowedParticipants,
      scheduledStartTime,
      autoStartMeeting,
      questions,
      shuffleQuestions,
      shuffleOptions,
      negativeMarking,
      negativeMarkingValue
    } = req.body;

    // Validation
    if (!title || !durationMinutes) {
      return res.status(400).json({ error: 'Title and duration are required' });
    }

    const assessmentRef = await db.collection('assessments').add({
      title,
      description: description || '',
      durationMinutes,
      allowedParticipants: allowedParticipants || [],
      scheduledStartTime: scheduledStartTime || null,
      autoStartMeeting: autoStartMeeting || false,
      questions: questions || [],
      shuffleQuestions: shuffleQuestions || false,
      shuffleOptions: shuffleOptions || false,
      negativeMarking: negativeMarking || false,
      negativeMarkingValue: negativeMarkingValue || 0,
      linkedProctorSessionId: null,
      isPublished: false,
      isDraft: true,
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({
      success: true,
      assessmentId: assessmentRef.id
    });
  } catch (error) {
    console.error('❌ Error creating assessment:', error);
    res.status(500).json({ error: 'Failed to create assessment' });
  }
});

/**
 * Get assessment by ID (with access control)
 * GET /api/assessments/:assessmentId
 */
router.get('/:assessmentId', verifyToken, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const assessmentDoc = await db.collection('assessments').doc(assessmentId).get();

    if (!assessmentDoc.exists) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessmentDoc.data();

    // Check access: either creator or allowed participant
    const isCreator = assessment.createdBy === req.user.uid;
    const isAllowedParticipant = assessment.allowedParticipants.includes(req.user.email);

    if (!isCreator && !isAllowedParticipant) {
      return res.status(403).json({ error: 'This assessment is not assigned to you' });
    }

    // Hide correct answers from participants
    let responseData = {
      id: assessmentDoc.id,
      ...assessment
    };

    if (!isCreator) {
      responseData.questions = assessment.questions.map(q => {
        const { correctAnswer, correctAnswers, ...rest } = q;
        return rest;
      });
    }

    res.json(responseData);
  } catch (error) {
    console.error('❌ Error fetching assessment:', error);
    res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

/**
 * Update assessment
 * PUT /api/assessments/:assessmentId
 */
router.put('/:assessmentId', verifyToken, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const assessmentRef = db.collection('assessments').doc(assessmentId);
    const assessmentDoc = await assessmentRef.get();

    if (!assessmentDoc.exists) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessmentDoc.data();

    // Only creator can update
    if (assessment.createdBy !== req.user.uid) {
      return res.status(403).json({ error: 'Only the creator can update this assessment' });
    }

    const updates = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Don't allow changing createdBy
    delete updates.createdBy;
    delete updates.createdAt;

    await assessmentRef.update(updates);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating assessment:', error);
    res.status(500).json({ error: 'Failed to update assessment' });
  }
});

/**
 * Publish assessment
 * POST /api/assessments/:assessmentId/publish
 */
router.post('/:assessmentId/publish', verifyToken, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const assessmentRef = db.collection('assessments').doc(assessmentId);
    const assessmentDoc = await assessmentRef.get();

    if (!assessmentDoc.exists) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessmentDoc.data();

    // Only creator can publish
    if (assessment.createdBy !== req.user.uid) {
      return res.status(403).json({ error: 'Only the creator can publish this assessment' });
    }

    await assessmentRef.update({
      isPublished: true,
      isDraft: false,
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error publishing assessment:', error);
    res.status(500).json({ error: 'Failed to publish assessment' });
  }
});

/**
 * Delete assessment
 * DELETE /api/assessments/:assessmentId
 */
router.delete('/:assessmentId', verifyToken, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const assessmentRef = db.collection('assessments').doc(assessmentId);
    const assessmentDoc = await assessmentRef.get();

    if (!assessmentDoc.exists) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessmentDoc.data();

    // Only creator can delete
    if (assessment.createdBy !== req.user.uid) {
      return res.status(403).json({ error: 'Only the creator can delete this assessment' });
    }

    await assessmentRef.delete();

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting assessment:', error);
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

/**
 * Get my assessments (created by me)
 * GET /api/assessments/my/created
 */
router.get('/my/created', verifyToken, async (req, res) => {
  try {
    const querySnapshot = await db.collection('assessments')
      .where('createdBy', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const assessments = [];
    querySnapshot.forEach(doc => {
      assessments.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(assessments);
  } catch (error) {
    console.error('❌ Error fetching my assessments:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

/**
 * Get assigned assessments (assigned to me)
 * GET /api/assessments/my/assigned
 */
router.get('/my/assigned', verifyToken, async (req, res) => {
  try {
    const querySnapshot = await db.collection('assessments')
      .where('allowedParticipants', 'array-contains', req.user.email)
      .where('isPublished', '==', true)
      .get();

    const assessments = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      // Hide correct answers
      const questions = data.questions.map(q => {
        const { correctAnswer, correctAnswers, ...rest } = q;
        return rest;
      });

      assessments.push({
        id: doc.id,
        ...data,
        questions
      });
    });

    res.json(assessments);
  } catch (error) {
    console.error('❌ Error fetching assigned assessments:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// ============================================================
// ATTEMPT ROUTES
// ============================================================

/**
 * Create an attempt
 * POST /api/assessments/:assessmentId/attempts
 */
router.post('/:assessmentId/attempts', verifyToken, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const assessmentDoc = await db.collection('assessments').doc(assessmentId).get();

    if (!assessmentDoc.exists) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessmentDoc.data();

    // Check if user is allowed to take this assessment
    if (!assessment.allowedParticipants.includes(req.user.email)) {
      return res.status(403).json({ error: 'You are not allowed to take this assessment' });
    }

    // Check if user has already attempted
    const existingAttempts = await db.collection('attempts')
      .where('assessmentId', '==', assessmentId)
      .where('userId', '==', req.user.uid)
      .get();

    if (!existingAttempts.empty) {
      return res.status(400).json({ error: 'You have already attempted this assessment' });
    }

    // Create attempt
    const attemptRef = await db.collection('attempts').add({
      assessmentId,
      userId: req.user.uid,
      userEmail: req.user.email,
      userName: req.body.userName || '',
      answers: [],
      score: null,
      violations: 0,
      violationLog: [],
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      submittedAt: null,
      status: 'in-progress',
      proctorSessionId: req.body.proctorSessionId || null
    });

    res.status(201).json({
      success: true,
      attemptId: attemptRef.id
    });
  } catch (error) {
    console.error('❌ Error creating attempt:', error);
    res.status(500).json({ error: 'Failed to create attempt' });
  }
});

/**
 * Submit attempt
 * POST /api/attempts/:attemptId/submit
 */
router.post('/attempts/:attemptId/submit', verifyToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body;

    const attemptRef = db.collection('attempts').doc(attemptId);
    const attemptDoc = await attemptRef.get();

    if (!attemptDoc.exists) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const attempt = attemptDoc.data();

    // Only attempt owner can submit
    if (attempt.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get assessment to calculate score
    const assessmentDoc = await db.collection('assessments').doc(attempt.assessmentId).get();
    const assessment = assessmentDoc.data();

    // Calculate score
    let score = 0;
    assessment.questions.forEach((question, index) => {
      const userAnswer = answers[index];
      
      if (!userAnswer || !userAnswer.answer) {
        return;
      }

      if (question.type === 'mcq') {
        if (userAnswer.answer === question.correctAnswer) {
          score += question.marks || 1;
        } else if (assessment.negativeMarking) {
          score -= assessment.negativeMarkingValue || 0;
        }
      } else if (question.type === 'checkbox') {
        const correctAnswers = question.correctAnswers || [];
        const userAnswers = userAnswer.answer || [];
        
        const isCorrect = correctAnswers.length === userAnswers.length &&
                          correctAnswers.every(ans => userAnswers.includes(ans));
        
        if (isCorrect) {
          score += question.marks || 1;
        } else if (assessment.negativeMarking) {
          score -= assessment.negativeMarkingValue || 0;
        }
      }
    });

    score = Math.max(0, score);

    // Update attempt
    await attemptRef.update({
      answers,
      score,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: req.body.status || 'submitted'
    });

    res.json({
      success: true,
      score
    });
  } catch (error) {
    console.error('❌ Error submitting attempt:', error);
    res.status(500).json({ error: 'Failed to submit attempt' });
  }
});

/**
 * Log a violation
 * POST /api/attempts/:attemptId/violations
 */
router.post('/attempts/:attemptId/violations', verifyToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { violationType } = req.body;

    const attemptRef = db.collection('attempts').doc(attemptId);
    const attemptDoc = await attemptRef.get();

    if (!attemptDoc.exists) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const attempt = attemptDoc.data();

    // Only attempt owner can log violations
    if (attempt.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await attemptRef.update({
      violations: admin.firestore.FieldValue.increment(1),
      violationLog: admin.firestore.FieldValue.arrayUnion({
        type: violationType,
        timestamp: new Date().toISOString()
      })
    });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error logging violation:', error);
    res.status(500).json({ error: 'Failed to log violation' });
  }
});

/**
 * Get attempts for an assessment (for host)
 * GET /api/assessments/:assessmentId/attempts
 */
router.get('/:assessmentId/attempts', verifyToken, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    
    // Check if user is the assessment creator
    const assessmentDoc = await db.collection('assessments').doc(assessmentId).get();
    if (!assessmentDoc.exists) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessmentDoc.data();
    if (assessment.createdBy !== req.user.uid) {
      return res.status(403).json({ error: 'Only the creator can view attempts' });
    }

    const querySnapshot = await db.collection('attempts')
      .where('assessmentId', '==', assessmentId)
      .orderBy('startedAt', 'desc')
      .get();

    const attempts = [];
    querySnapshot.forEach(doc => {
      attempts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(attempts);
  } catch (error) {
    console.error('❌ Error fetching attempts:', error);
    res.status(500).json({ error: 'Failed to fetch attempts' });
  }
});

// ============================================================
// PROCTOR SESSION ROUTES
// ============================================================

/**
 * Create proctor session
 * POST /api/assessments/:assessmentId/proctor-session
 */
router.post('/:assessmentId/proctor-session', verifyToken, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    
    const sessionRef = await db.collection('proctorSessions').add({
      assessmentId,
      hostId: req.user.uid,
      participants: [],
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update assessment with linked proctor session
    await db.collection('assessments').doc(assessmentId).update({
      linkedProctorSessionId: sessionRef.id
    });

    res.status(201).json({
      success: true,
      sessionId: sessionRef.id
    });
  } catch (error) {
    console.error('❌ Error creating proctor session:', error);
    res.status(500).json({ error: 'Failed to create proctor session' });
  }
});

module.exports = router;

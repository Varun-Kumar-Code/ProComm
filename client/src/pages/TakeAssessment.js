// src/pages/TakeAssessment.js
// Assessment taking page with security features and live proctoring

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Peer from 'peerjs';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Eye,
  Send,
  Maximize,
  AlertTriangle,
  Ban
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PreAssessmentScreen from './PreAssessmentScreen';
import {
  getAssessment,
  createAttempt,
  updateAttempt,
  submitAttempt,
  logViolation,
  shuffleArray,
  getUserAttempts
} from '../firebase/assessmentService';

const TakeAssessment = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [showPreScreen, setShowPreScreen] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [violations, setViolations] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [questionsToDisplay, setQuestionsToDisplay] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [attemptLimitReached, setAttemptLimitReached] = useState(false);
  const [existingAttempts, setExistingAttempts] = useState(0);

  // WebRTC/Proctoring state
  const [peer, setPeer] = useState(null);
  const [peerId, setPeerId] = useState('');
  const [mediaStream, setMediaStream] = useState(null);
  const [isProctoringActive, setIsProctoringActive] = useState(false);

  const timerRef = useRef(null);
  const autoSaveRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const mediaStreamRef = useRef(null); // Ref to ensure stream is always available for calls
  const calledMonitorsRef = useRef(new Set()); // Track which monitors we've already called
  const peerRef = useRef(null); // Store peer instance in ref

  useEffect(() => {
    fetchAssessment();

    // Cleanup on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (peer) {
        peer.destroy();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  const fetchAssessment = async () => {
    setIsLoading(true);
    try {
      const data = await getAssessment(assessmentId);
      setAssessment(data);

      // Prepare questions (shuffle if needed)
      let questions = [...data.questions];
      if (data.shuffleQuestions) {
        questions = shuffleArray(questions);
      }

      // Shuffle options if needed
      if (data.shuffleOptions) {
        questions = questions.map(q => {
          if (q.type === 'mcq' || q.type === 'checkbox') {
            return {
              ...q,
              options: shuffleArray(q.options)
            };
          }
          return q;
        });
      }

      setQuestionsToDisplay(questions);
      setTimeRemaining(data.durationMinutes * 60); // Convert to seconds
      
      // Check attempt limit
      if (currentUser && data.maxAttempts) {
        const userAttempts = await getUserAttempts(currentUser.uid, assessmentId);
        const completedAttempts = userAttempts.filter(a => a.status === 'submitted' || a.status === 'auto-submitted');
        setExistingAttempts(completedAttempts.length);
        
        if (completedAttempts.length >= data.maxAttempts) {
          setAttemptLimitReached(true);
        }
      }
      
      // Initialize answers array
      const initialAnswers = questions.map(() => ({ answer: null }));
      setAnswers(initialAnswers);
    } catch (error) {
      console.error('Error fetching assessment:', error);
      alert('Failed to load assessment');
      navigate('/assessments');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize WebRTC proctoring
  const initializeProctoring = async () => {
    try {
      console.log('🔑 [PROCTORING] Assessment ID:', assessmentId);
      console.log('🎥 [PROCTORING] Initializing...');

      // Get camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      setMediaStream(stream);
      mediaStreamRef.current = stream; // Store in ref for call handler
      console.log('✅ [PROCTORING] Media stream obtained');
      console.log('✅ [PROCTORING] Video tracks:', stream.getVideoTracks().length);
      console.log('✅ [PROCTORING] Audio tracks:', stream.getAudioTracks().length);

      // Initialize PeerJS
      const newPeer = new Peer(undefined, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        debug: 2, // Enable PeerJS debug logging
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            // Free TURN servers for NAT traversal
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            }
          ]
        }
      });

      newPeer.on('open', (id) => {
        console.log('🎯 [PROCTORING] Peer ID:', id);
        console.log('🎯 [PROCTORING] Peer open and ready to receive calls');
        setPeerId(id);
        setPeer(newPeer);
        peerRef.current = newPeer; // Store in ref
        setIsProctoringActive(true);

        // Register with peer discovery
        registerWithPeerDiscovery(id, stream);

        // Start heartbeat to keep peer alive and discover new monitors
        startHeartbeat(id);
        
        // Quick follow-up discovery after 2 seconds in case monitor joined right after us
        setTimeout(() => {
          if (mediaStreamRef.current && peerRef.current) {
            console.log('🔄 [PROCTORING] Quick follow-up discovery');
            registerWithPeerDiscovery(id, mediaStreamRef.current);
          }
        }, 2000);
      });
      
      newPeer.on('connection', (conn) => {
        console.log('🔗 [PROCTORING] Data connection from:', conn.peer);
      });

      // Handle incoming calls (from monitor)
      newPeer.on('call', (call) => {
        console.log('📞 [PROCTORING] Incoming call from:', call.peer);
        console.log('📞 [PROCTORING] Call metadata:', call.metadata);
        
        // Use ref to ensure we have the latest stream
        const currentStream = mediaStreamRef.current || stream;
        
        if (!currentStream) {
          console.error('❌ [PROCTORING] No stream available to answer call!');
          return;
        }
        
        console.log('📞 [PROCTORING] Answering with stream:');
        console.log('   - Video tracks:', currentStream.getVideoTracks().length);
        console.log('   - Audio tracks:', currentStream.getAudioTracks().length);
        console.log('   - Stream active:', currentStream.active);
        console.log('   - Video enabled:', currentStream.getVideoTracks()[0]?.enabled);
        console.log('   - Audio enabled:', currentStream.getAudioTracks()[0]?.enabled);
        
        // Answer with our stream so monitor can see us
        call.answer(currentStream);
        console.log('✅ [PROCTORING] Call answered!');
        
        call.on('stream', (remoteStream) => {
          console.log('📹 [PROCTORING] Received remote stream from monitor');
        });
        
        call.on('close', () => {
          console.log('📴 [PROCTORING] Call closed from:', call.peer);
        });
        
        call.on('error', (error) => {
          console.error('❌ [PROCTORING] Call error:', error);
        });
      });

      newPeer.on('error', (error) => {
        console.error('❌ [PROCTORING] Peer error:', error);
        console.error('❌ [PROCTORING] Error type:', error.type);
      });
      
      newPeer.on('disconnected', () => {
        console.warn('⚠️ [PROCTORING] Peer disconnected from server - attempting reconnect');
        // Try to reconnect
        if (!newPeer.destroyed) {
          newPeer.reconnect();
        }
      });
      
      newPeer.on('close', () => {
        console.warn('⚠️ [PROCTORING] Peer connection closed');
      });

    } catch (error) {
      console.error('❌ [PROCTORING] Failed to initialize:', error);
      alert('Failed to access camera/microphone. Please allow permissions and try again.');
      throw error;
    }
  };

  // Register with peer discovery system
  const registerWithPeerDiscovery = async (pId, stream) => {
    try {
      const payload = {
        peerId: pId,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        userEmail: currentUser.email,
        isHost: false,
        isMonitor: false,
        hasVideo: stream.getVideoTracks().length > 0,
        hasAudio: stream.getAudioTracks().length > 0
      };
      
      console.log('📤 [PROCTORING] Registering with payload:', payload);
      console.log('📤 [PROCTORING] Peer ID:', pId);
      console.log('📤 [PROCTORING] User ID:', currentUser.uid);
      console.log('📤 [PROCTORING] Assessment ID:', assessmentId);
      
      const response = await fetch(`/api/peer-discovery/${assessmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [PROCTORING] Registered with peer discovery. Response:', data);
        console.log('✅ [PROCTORING] Total peers now:', data.totalPeers);
        console.log('✅ [PROCTORING] Other peers:', data.peers);
        
        // Call any monitors that are already present
        if (data.peers && data.peers.length > 0) {
          const monitors = data.peers.filter(p => p.isMonitor || p.isHost);
          console.log('👁️ [PROCTORING] Found monitors to call:', monitors.length);
          monitors.forEach(monitor => {
            callMonitor(monitor.peerId, stream, pId);
          });
        }
      } else {
        console.error('❌ [PROCTORING] Failed to register:', response.status, response.statusText);
      }
      return response.ok;
    } catch (error) {
      console.error('❌ [PROCTORING] Registration error:', error);
      return false;
    }
  };

  // Call a monitor to send our stream
  const callMonitor = (monitorPeerId, stream, myPeerId) => {
    // Skip if already called this monitor
    if (calledMonitorsRef.current.has(monitorPeerId)) {
      console.log('ℹ️ [PROCTORING] Already called monitor:', monitorPeerId);
      return;
    }
    
    const currentPeer = peerRef.current;
    if (!currentPeer) {
      console.warn('⚠️ [PROCTORING] No peer available to call monitor');
      return;
    }
    
    console.log('📞 [PROCTORING] Calling monitor:', monitorPeerId);
    console.log('📞 [PROCTORING] With stream - video:', stream.getVideoTracks().length, 'audio:', stream.getAudioTracks().length);
    
    // Mark as called
    calledMonitorsRef.current.add(monitorPeerId);
    
    // Call the monitor with our stream
    const call = currentPeer.call(monitorPeerId, stream, {
      metadata: {
        isMonitor: false,
        isHost: false,
        userName: currentUser?.displayName || currentUser?.email || 'Participant',
        userId: currentUser?.uid,
        userEmail: currentUser?.email
      }
    });
    
    if (!call) {
      console.error('❌ [PROCTORING] Failed to create call to monitor');
      calledMonitorsRef.current.delete(monitorPeerId);
      return;
    }
    
    console.log('✅ [PROCTORING] Call initiated to monitor:', monitorPeerId);
    
    call.on('stream', (remoteStream) => {
      console.log('📹 [PROCTORING] Received stream from monitor (empty expected)');
    });
    
    call.on('close', () => {
      console.log('📴 [PROCTORING] Call to monitor closed:', monitorPeerId);
      calledMonitorsRef.current.delete(monitorPeerId);
    });
    
    call.on('error', (error) => {
      console.error('❌ [PROCTORING] Call to monitor error:', error);
      calledMonitorsRef.current.delete(monitorPeerId);
    });
  };

  // Keep peer alive with heartbeat
  const startHeartbeat = (pId) => {
    const sendHeartbeat = async () => {
      try {
        // Use mediaStreamRef for reliable stream access
        const currentStream = mediaStreamRef.current;
        if (!currentStream) {
          console.warn('⚠️ [PROCTORING] No stream available for heartbeat');
          return;
        }
        // Re-register to update lastSeen timestamp and check for new monitors
        const success = await registerWithPeerDiscovery(pId, currentStream);
        if (success) {
          console.log('💓 [PROCTORING] Heartbeat sent successfully');
        }
      } catch (error) {
        console.error('❌ [PROCTORING] Heartbeat error:', error);
      }
    };

    // Send heartbeat every 5 seconds for faster monitor discovery
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 5000);
    console.log('💓 [PROCTORING] Heartbeat started (every 5 seconds)');
  };

  const handleStartAssessment = async () => {
    try {
      console.log('🚀 [ASSESSMENT] Starting assessment:', assessmentId);
      console.log('🚀 [ASSESSMENT] User:', currentUser.uid, currentUser.email);
      
      // Create attempt
      const newAttemptId = await createAttempt({
        assessmentId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName || 'Unknown'
      });
      setAttemptId(newAttemptId);
      console.log('✅ [ASSESSMENT] Attempt created:', newAttemptId);

      // Enter fullscreen
      enterFullscreen();

      // Set up violation tracking
      setupViolationTracking();

      // Start timer
      startTimer();

      // Start auto-save
      startAutoSave();

      // Hide pre-screen
      setShowPreScreen(false);

      // Initialize WebRTC proctoring
      console.log('🎥 [ASSESSMENT] Initializing proctoring...');
      await initializeProctoring();
      console.log('✅ [ASSESSMENT] Proctoring initialized successfully');
    } catch (error) {
      console.error('❌ [ASSESSMENT] Error starting assessment:', error);
      alert('Failed to start assessment: ' + error.message);
    }
  };

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
      });
    }
  };

  const setupViolationTracking = () => {
    // Track tab visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Disable right-click
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Disable certain keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
  };

  const handleVisibilityChange = async () => {
    if (document.hidden && attemptId) {
      await recordViolation('tab_switch');
    }
  };

  const handleFullscreenChange = async () => {
    const isCurrentlyFullscreen = !!document.fullscreenElement;
    setIsFullscreen(isCurrentlyFullscreen);

    if (!isCurrentlyFullscreen && attemptId && !showPreScreen) {
      await recordViolation('fullscreen_exit');
    }
  };

  const handleKeyDown = (e) => {
    // Disable F12 (DevTools)
    if (e.key === 'F12') {
      e.preventDefault();
    }
    // Disable Ctrl+Shift+I (DevTools)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault();
    }
    // Disable Ctrl+C (Copy)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
    }
    // Disable Ctrl+V (Paste)
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
    }
  };

  const recordViolation = async (type) => {
    // Don't record more violations if already blocked
    if (isBlocked) return;
    
    const newViolationCount = violations + 1;
    setViolations(newViolationCount);

    if (attemptId) {
      await logViolation(attemptId, type);
    }

    // Block user after 3 violations
    if (newViolationCount >= 3) {
      setIsBlocked(true);
      // Auto-submit with blocked status
      handleSubmit(true, true); // Second parameter indicates blocked
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - auto submit
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startAutoSave = () => {
    // Auto-save every 30 seconds
    autoSaveRef.current = setInterval(() => {
      saveAnswers();
    }, 30000);
  };

  const saveAnswers = async () => {
    if (attemptId) {
      try {
        await updateAttempt(attemptId, { answers });
      } catch (error) {
        console.error('Error auto-saving answers:', error);
      }
    }
  };

  const handleAnswerChange = (value) => {
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = {
      ...updatedAnswers[currentQuestionIndex],
      answer: value
    };
    setAnswers(updatedAnswers);
  };

  const handleCheckboxChange = (option) => {
    const currentAnswer = answers[currentQuestionIndex]?.answer || [];
    let updatedAnswer;

    if (currentAnswer.includes(option)) {
      updatedAnswer = currentAnswer.filter(a => a !== option);
    } else {
      updatedAnswer = [...currentAnswer, option];
    }

    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = {
      ...updatedAnswers[currentQuestionIndex],
      answer: updatedAnswer
    };
    setAnswers(updatedAnswers);
  };

  const handleSubmit = async (isAutoSubmit = false, isBlockedSubmit = false) => {
    if (!isAutoSubmit && !isBlockedSubmit) {
      const confirmSubmit = window.confirm(
        'Are you sure you want to submit? You cannot change your answers after submission.'
      );
      if (!confirmSubmit) return;
    }

    try {
      // Stop timer and auto-save
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);

      // Clean up proctoring
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (peer) {
        // Unregister from peer discovery
        try {
          await fetch(`/api/peer-discovery/${assessmentId}?peerId=${peerId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err) {
          console.error('Failed to unregister peer:', err);
        }
        peer.destroy();
      }
      setIsProctoringActive(false);

      // Calculate score (will be done on backend, but we can preview client-side)
      let score = 0;
      questionsToDisplay.forEach((question, index) => {
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

      // Determine submission status
      let status = 'submitted';
      if (isBlockedSubmit) {
        status = 'blocked';
      } else if (isAutoSubmit) {
        status = 'auto-submitted';
      }

      // Submit attempt
      await submitAttempt(
        attemptId,
        answers,
        score,
        status
      );

      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }

      // Navigate to results (or show blocked message)
      if (isBlockedSubmit) {
        // Don't navigate, show blocked UI
        return;
      }
      navigate(`/assessments/${assessmentId}/results/${attemptId}`);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert('Failed to submit assessment');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questionsToDisplay[currentQuestionIndex];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show attempt limit reached screen
  if (attemptLimitReached) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <Ban className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Attempt Limit Reached
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            You have already used all {assessment.maxAttempts} attempt{assessment.maxAttempts > 1 ? 's' : ''} for this assessment.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Completed attempts: {existingAttempts}/{assessment.maxAttempts}
          </p>
          <button
            onClick={() => navigate('/assessments')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  // Show blocked screen if user exceeded violations
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <Ban className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-3">
            Assessment Blocked
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You have been permanently blocked from this assessment due to multiple violations.
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Violations: {violations}/3</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              Tab switching or exiting fullscreen more than 3 times results in automatic blocking.
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Your answers have been auto-submitted. Contact your instructor for more information.
          </p>
          <button
            onClick={() => navigate('/assessments')}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  if (showPreScreen) {
    return (
      <PreAssessmentScreen
        assessment={assessment}
        onStart={handleStartAssessment}
        onCancel={() => navigate('/assessments')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a]">
      {/* Fullscreen Warning Bar with Re-enter Button */}
      {!isFullscreen && (
        <div className="bg-red-600 text-white px-4 py-2 md:py-3 flex flex-col sm:flex-row items-center justify-center gap-2 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-medium text-sm md:text-base">You exited fullscreen mode!</span>
          </div>
          <button
            onClick={enterFullscreen}
            className="flex items-center space-x-2 px-3 md:px-4 py-1.5 bg-white text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors text-sm"
          >
            <Maximize className="w-4 h-4" />
            <span>Return to Fullscreen</span>
          </button>
        </div>
      )}

      {/* Violations Warning Bar */}
      {violations > 0 && (
        <div className={`px-4 py-2 text-center text-xs md:text-sm font-medium ${
          violations >= 2 ? 'bg-red-600' : 'bg-orange-600'
        } text-white`}>
          <div className="flex items-center justify-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>Violations: {violations}/3 - {violations >= 2 ? 'WARNING: One more will block you!' : 'Blocked after 3 violations'}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-xl font-bold text-gray-900 dark:text-white truncate">
                {assessment.title}
              </h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Question {currentQuestionIndex + 1} of {questionsToDisplay.length}
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-6">
              {/* Timer */}
              <div className="flex items-center space-x-1.5 md:space-x-2">
                <Clock className={`w-4 h-4 md:w-5 md:h-5 ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`} />
                <span className={`text-base md:text-lg font-mono font-bold ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>

              {/* Proctoring Indicator */}
              {isProctoringActive && (
                <div className="flex items-center space-x-1.5 text-green-600">
                  <Eye className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm font-medium hidden sm:inline">Proctoring</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={() => handleSubmit(false)}
                className="flex items-center space-x-1.5 md:space-x-2 px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm md:text-base"
              >
                <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>Submit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8">
        <div className="flex flex-col lg:flex-row lg:space-x-6">
          {/* Question Navigator - Horizontal on mobile, Sidebar on desktop */}
          <div className="lg:w-64 lg:flex-shrink-0 mb-4 lg:mb-0">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-3 md:p-4 lg:sticky lg:top-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 md:mb-3 text-sm md:text-base">Questions</h3>
              <div className="flex lg:grid lg:grid-cols-4 gap-1.5 md:gap-2 overflow-x-auto pb-2 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0">
                {questionsToDisplay.map((q, index) => {
                  const isAnswered = answers[index]?.answer != null &&
                    (Array.isArray(answers[index]?.answer) ? answers[index]?.answer.length > 0 : true);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`flex-shrink-0 w-9 h-9 md:w-10 md:h-10 lg:w-auto lg:aspect-square flex items-center justify-center rounded-lg text-xs md:text-sm font-medium transition-colors ${
                        index === currentQuestionIndex
                          ? 'bg-blue-600 text-white'
                          : isAnswered
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="w-4 h-4 bg-gray-100 dark:bg-slate-700 rounded"></div>
                  <span>Not Answered</span>
                </div>
              </div>
            </div>
          </div>

          {/* Question Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 md:p-6 min-h-[400px] md:min-h-[500px]">
              {/* Question */}
              <div className="mb-4 md:mb-6">
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                    Question {currentQuestionIndex + 1}
                  </h2>
                  <span className="px-2 md:px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs md:text-sm rounded-full whitespace-nowrap">
                    {currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                  </span>
                </div>
                <p className="text-gray-800 dark:text-gray-200 text-base md:text-lg">
                  {currentQuestion.question}
                  {currentQuestion.required && <span className="text-red-600 ml-1">*</span>}
                </p>
              </div>

              {/* Answer Options */}
              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                {currentQuestion.type === 'mcq' && (
                  <>
                    {currentQuestion.options.map((option, index) => (
                      <label
                        key={index}
                        className="flex items-start space-x-2 md:space-x-3 p-3 md:p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          name="answer"
                          value={option}
                          checked={answers[currentQuestionIndex]?.answer === option}
                          onChange={(e) => handleAnswerChange(e.target.value)}
                          className="w-4 h-4 md:w-5 md:h-5 mt-0.5 text-blue-600"
                        />
                        <span className="flex-1 text-sm md:text-base text-gray-900 dark:text-white">{option}</span>
                      </label>
                    ))}
                  </>
                )}

                {currentQuestion.type === 'checkbox' && (
                  <>
                    {currentQuestion.options.map((option, index) => (
                      <label
                        key={index}
                        className="flex items-start space-x-2 md:space-x-3 p-3 md:p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          value={option}
                          checked={(answers[currentQuestionIndex]?.answer || []).includes(option)}
                          onChange={() => handleCheckboxChange(option)}
                          className="w-4 h-4 md:w-5 md:h-5 mt-0.5 text-blue-600"
                        />
                        <span className="flex-1 text-sm md:text-base text-gray-900 dark:text-white">{option}</span>
                      </label>
                    ))}
                  </>
                )}

                {currentQuestion.type === 'short' && (
                  <input
                    type="text"
                    value={answers[currentQuestionIndex]?.answer || ''}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Enter your answer"
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {currentQuestion.type === 'paragraph' && (
                  <textarea
                    value={answers[currentQuestionIndex]?.answer || ''}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Enter your answer"
                    rows={5}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 md:pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                >
                  <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                  <span>Previous</span>
                </button>

                {currentQuestionIndex < questionsToDisplay.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    className="flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm md:text-base"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubmit(false)}
                    className="flex items-center space-x-1 md:space-x-2 px-4 md:px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm md:text-base"
                  >
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden sm:inline">Submit Assessment</span>
                    <span className="sm:hidden">Submit</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeAssessment;

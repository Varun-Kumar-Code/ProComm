// src/pages/PreAssessmentScreen.js
// Pre-assessment validation and information screen - Premium Design

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Mic,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Eye,
  Play,
  ArrowLeft,
  Sparkles,
  Award,
  Zap
} from 'lucide-react';

const PreAssessmentScreen = ({ assessment, onStart, onCancel }) => {
  const [cameraPermission, setCameraPermission] = useState('pending'); // pending, granted, denied
  const [micPermission, setMicPermission] = useState('pending');
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    checkPermissions();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach stream to video element when both are available
  useEffect(() => {
    if (stream && videoRef.current) {
      console.log('📹 Attaching stream to video element');
      videoRef.current.srcObject = stream;
      
      videoRef.current.onloadedmetadata = () => {
        console.log('📹 Video metadata loaded, playing video...');
        videoRef.current.play().catch(err => {
          console.error('❌ Error playing video:', err);
        });
      };
    }
  }, [stream]);

  const checkPermissions = async () => {
    try {
      console.log('🎥 Requesting camera and microphone permissions...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      console.log('✅ Media stream obtained:', {
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length,
        active: mediaStream.active
      });

      setStream(mediaStream);
      setCameraPermission('granted');
      setMicPermission('granted');
    } catch (error) {
      console.error('❌ Permission error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraPermission('denied');
        setMicPermission('denied');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraPermission('not-found');
        setMicPermission('not-found');
      } else {
        setCameraPermission('error');
        setMicPermission('error');
      }
    }
  };

  const handleRetryPermissions = () => {
    setCameraPermission('pending');
    setMicPermission('pending');
    checkPermissions();
  };

  const canStart = cameraPermission === 'granted' && micPermission === 'granted';

  const totalMarks = assessment.questions?.reduce((sum, q) => sum + (q.marks || 1), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 py-4 md:py-8">

      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-5 md:mb-8">
          <button
            onClick={onCancel}
            className="mb-4 md:mb-6 flex items-center space-x-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm md:text-base">Back to Dashboard</span>
          </button>

          <div className="flex items-center space-x-2 md:space-x-3 mb-2 md:mb-3">
            <div className="p-1.5 md:p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg md:rounded-xl shadow-lg shadow-purple-500/25">
              <Award className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-violet-900 dark:from-white dark:via-purple-200 dark:to-violet-200 bg-clip-text text-transparent">
                {assessment.title}
              </h1>
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-amber-500 animate-pulse hidden sm:block" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-slate-400 text-sm md:text-lg max-w-2xl">
            {assessment.description || 'Complete the pre-assessment checklist to begin'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Left Column: Assessment Info */}
          <div className="space-y-4 md:space-y-6">
            {/* Assessment Details */}
            <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 p-4 md:p-6 hover:shadow-2xl transition-all duration-500">
              <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-5 flex items-center space-x-2">
                <FileText className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                <span>Assessment Details</span>
              </h2>

              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center space-x-3 md:space-x-4 p-3 md:p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg md:rounded-xl">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg md:rounded-xl shadow-lg shadow-blue-500/25">
                    <Clock className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider font-medium">Duration</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                      {assessment.durationMinutes} minutes
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 md:space-x-4 p-3 md:p-4 bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-900/10 dark:to-green-900/10 rounded-lg md:rounded-xl">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg md:rounded-xl shadow-lg shadow-emerald-500/25">
                    <FileText className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider font-medium">Questions</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                      {assessment.questions?.length || 0} questions
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 md:space-x-4 p-3 md:p-4 bg-gradient-to-r from-purple-50/50 to-violet-50/50 dark:from-purple-900/10 dark:to-violet-900/10 rounded-lg md:rounded-xl">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg md:rounded-xl shadow-lg shadow-purple-500/25">
                    <Award className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider font-medium">Total Marks</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                      {totalMarks} marks
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 p-4 md:p-6">
              <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-5 flex items-center space-x-2">
                <Zap className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                <span>Instructions</span>
              </h2>

              <ul className="space-y-2 md:space-y-3">
                {[
                  'Read each question carefully before answering',
                  'You can navigate between questions freely',
                  'Click "Submit" when you\'re done',
                  'The timer will count down automatically',
                  'Your answers are saved automatically'
                ].map((instruction, index) => (
                  <li key={index} className="flex items-start space-x-2 md:space-x-3 text-gray-600 dark:text-slate-400 text-sm md:text-base">
                    <span className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-400">{index + 1}</span>
                    <span>{instruction}</span>
                  </li>
                ))}
                {assessment.negativeMarking && (
                  <li className="flex items-start space-x-2 md:space-x-3 text-red-600 dark:text-red-400 font-medium text-sm md:text-base">
                    <span className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-[10px] md:text-xs">!</span>
                    <span>Negative marking is enabled (-{assessment.negativeMarkingValue} marks for wrong answers)</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Proctoring Warning */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/30 rounded-xl md:rounded-2xl p-3 md:p-5">
              <div className="flex items-start space-x-3 md:space-x-4">
                <div className="p-1.5 md:p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg md:rounded-xl shadow-lg shadow-amber-500/25 flex-shrink-0">
                  <Eye className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 dark:text-amber-200 mb-1 md:mb-2 text-sm md:text-lg">
                    Live Proctoring Active
                  </h3>
                  <p className="text-amber-800 dark:text-amber-300 text-xs md:text-base">
                    This assessment is monitored with live proctoring. Your video and audio will be recorded.
                  </p>
                </div>
              </div>
            </div>

            {/* Violation Rules */}
            <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200/50 dark:border-red-800/30 rounded-xl md:rounded-2xl p-3 md:p-5">
              <div className="flex items-start space-x-3 md:space-x-4">
                <div className="p-1.5 md:p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg md:rounded-xl shadow-lg shadow-red-500/25 flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-red-900 dark:text-red-200 mb-2 md:mb-3 text-sm md:text-lg">
                    Important: Violation Rules
                  </h3>
                  <ul className="space-y-1.5 md:space-y-2">
                    {[
                      'Do not switch tabs or windows',
                      'Do not exit fullscreen mode',
                      'Keep face visible to camera',
                      '3 violations = auto-submit'
                    ].map((rule, index) => (
                      <li key={index} className="flex items-center space-x-2 text-red-800 dark:text-red-300 text-xs md:text-sm">
                        <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Media Permissions */}
          <div className="space-y-4 md:space-y-6">
            {/* Camera Preview */}
            <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 p-4 md:p-6">
              <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-5 flex items-center space-x-2">
                <Camera className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                <span>Camera Preview</span>
              </h2>

              <div className="aspect-video bg-gradient-to-br from-gray-900 to-slate-900 rounded-lg md:rounded-xl overflow-hidden mb-4 md:mb-5 shadow-lg">
                {cameraPermission === 'granted' ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-3 md:space-y-4">
                    <div className="p-3 md:p-4 bg-white/10 rounded-xl md:rounded-2xl">
                      <Camera className="w-8 h-8 md:w-12 md:h-12 text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-xs md:text-sm">Camera preview will appear here</p>
                  </div>
                )}
              </div>

              {/* Permission Status */}
              <div className="space-y-2 md:space-y-3">
                {/* Camera Status */}
                <div className="flex items-center justify-between p-3 md:p-4 bg-gray-50/50 dark:bg-slate-700/30 rounded-lg md:rounded-xl">
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <div className={`p-1.5 md:p-2 rounded-lg ${cameraPermission === 'granted' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-slate-600'}`}>
                      <Camera className={`w-4 h-4 md:w-5 md:h-5 ${cameraPermission === 'granted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-slate-400'}`} />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                      Camera
                    </span>
                  </div>
                  {cameraPermission === 'granted' ? (
                    <div className="flex items-center space-x-1.5 md:space-x-2 px-2 md:px-3 py-1 md:py-1.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-full shadow-lg shadow-emerald-500/25">
                      <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="text-xs md:text-sm font-medium">Connected</span>
                    </div>
                  ) : cameraPermission === 'pending' ? (
                    <div className="flex items-center space-x-1.5 md:space-x-2 px-2 md:px-3 py-1 md:py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                      <div className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs md:text-sm font-medium">Checking...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 md:space-x-2 px-2 md:px-3 py-1 md:py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                      <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="text-xs md:text-sm font-medium">Denied</span>
                    </div>
                  )}
                </div>

                {/* Microphone Status */}
                <div className="flex items-center justify-between p-3 md:p-4 bg-gray-50/50 dark:bg-slate-700/30 rounded-lg md:rounded-xl">
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <div className={`p-1.5 md:p-2 rounded-lg ${micPermission === 'granted' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-slate-600'}`}>
                      <Mic className={`w-4 h-4 md:w-5 md:h-5 ${micPermission === 'granted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-slate-400'}`} />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                      Microphone
                    </span>
                  </div>
                  {micPermission === 'granted' ? (
                    <div className="flex items-center space-x-1.5 md:space-x-2 px-2 md:px-3 py-1 md:py-1.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-full shadow-lg shadow-emerald-500/25">
                      <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="text-xs md:text-sm font-medium">Connected</span>
                    </div>
                  ) : micPermission === 'pending' ? (
                    <div className="flex items-center space-x-1.5 md:space-x-2 px-2 md:px-3 py-1 md:py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                      <div className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs md:text-sm font-medium">Checking...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 md:space-x-2 px-2 md:px-3 py-1 md:py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                      <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="text-xs md:text-sm font-medium">Denied</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Messages */}
              {(cameraPermission === 'denied' || micPermission === 'denied') && (
                <div className="mt-4 md:mt-5 p-3 md:p-5 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200/50 dark:border-red-800/30 rounded-lg md:rounded-xl">
                  <p className="text-red-800 dark:text-red-300 font-medium mb-2 md:mb-3 text-sm md:text-base">
                    Camera and microphone access is required:
                  </p>
                  <ol className="space-y-1.5 md:space-y-2 text-red-700 dark:text-red-300 ml-4 md:ml-5 list-decimal text-xs md:text-sm">
                    <li>Click the camera icon in your browser's address bar</li>
                    <li>Allow camera and microphone access</li>
                    <li>Refresh the page or click "Retry" below</li>
                  </ol>
                  <button
                    onClick={handleRetryPermissions}
                    className="mt-3 md:mt-4 w-full px-4 md:px-5 py-2.5 md:py-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-lg md:rounded-xl transition-all duration-300 shadow-lg shadow-red-500/25 font-semibold text-sm md:text-base"
                  >
                    Retry Permissions
                  </button>
                </div>
              )}

              {(cameraPermission === 'not-found' || micPermission === 'not-found') && (
                <div className="mt-4 md:mt-5 p-3 md:p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/30 rounded-lg md:rounded-xl">
                  <p className="text-amber-800 dark:text-amber-300 text-sm md:text-base">
                    Camera or microphone not found. Please ensure your devices are connected and try again.
                  </p>
                </div>
              )}
            </div>

            {/* Start Button */}
            <button
              onClick={onStart}
              disabled={!canStart}
              className={`group w-full flex items-center justify-center space-x-2 md:space-x-3 px-4 md:px-6 py-4 md:py-5 rounded-xl md:rounded-2xl text-base md:text-xl font-bold transition-all duration-300 ${
                canStart
                  ? 'bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-600 hover:from-purple-600 hover:via-violet-600 hover:to-indigo-700 text-white shadow-xl shadow-purple-500/25 hover:shadow-2xl hover:shadow-purple-500/30 hover:-translate-y-1'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              {canStart ? (
                <>
                  <Play className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
                  <span>Start Assessment</span>
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 opacity-70 hidden sm:block" />
                </>
              ) : (
                <>
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-gray-400 dark:border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Checking Permissions...</span>
                </>
              )}
            </button>

            {canStart && (
              <p className="text-xs md:text-sm text-center text-gray-500 dark:text-slate-400">
                By starting this assessment, you agree to be monitored via live proctoring
              </p>
            )}

            {/* Copyright Footer - Desktop Only */}
            <div className="hidden md:block mt-6 md:mt-8 pt-4 md:pt-6">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                © 2026 ProComm. All rights reserved. · <Link to="/privacy" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Privacy</Link> · <Link to="/cookies" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Cookies</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreAssessmentScreen;

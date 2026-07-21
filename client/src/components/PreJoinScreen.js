import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Settings, AlertCircle, CheckCircle } from 'lucide-react';

const PreJoinScreen = ({ onJoin, userName, meetingTitle }) => {
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [previewStream, setPreviewStream] = useState(null);
  const [error, setError] = useState('');
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    // Get preview stream with both audio and video
    const getPreviewMedia = async () => {
      setIsLoadingMedia(true);
      try {
        // In proctored mode for participants, get media but keep it disabled
        const constraints = {
          video: {
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 60, max: 60 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        console.log('🎥 Preview stream obtained:', {
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length
        });
        
        setPreviewStream(stream);
        
        // Don't attach stream here - let the separate useEffect handle it
        if (stream.getVideoTracks().length === 0) {
          setVideoReady(true); // No video track, mark as ready anyway
        }
      } catch (err) {
        console.error('Error getting preview media:', err);
        setError('Unable to access camera or microphone. Please check your permissions.');
        
        // Try to get at least one of them
        try {
          const videoOnlyStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          setPreviewStream(videoOnlyStream);
          setIsMicEnabled(false);
          setError('info:Microphone not available. Joining with camera only.');
        } catch (videoErr) {
          try {
            const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            setPreviewStream(audioOnlyStream);
            setIsVideoEnabled(false);
            setError('info:Camera not available. Joining with audio only.');
          } catch (audioErr) {
            setError('Cannot access camera or microphone. Please check your browser permissions.');
          }
        }
      } finally {
        setIsLoadingMedia(false);
      }
    };

    getPreviewMedia();

    // Cleanup on unmount
    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach stream to video element when both are available
  useEffect(() => {
    if (previewStream && videoRef.current && previewStream.getVideoTracks().length > 0) {
      console.log('📹 Attaching stream to video element');
      videoRef.current.srcObject = previewStream;
      
      videoRef.current.onloadedmetadata = () => {
        console.log('📹 Video metadata loaded, attempting to play');
        videoRef.current.play().then(() => {
          console.log('✅ Video playing successfully');
          setVideoReady(true);
        }).catch(err => console.error('❌ Video play error:', err));
      };
    }
  }, [previewStream]);

  // Monitor video track state changes
  useEffect(() => {
    console.log('🔍 Video state check:', {
      hasStream: !!previewStream,
      hasVideoRef: !!videoRef.current,
      isVideoEnabled,
      videoReady,
      videoTracks: previewStream?.getVideoTracks().length || 0
    });
    
    if (previewStream && videoRef.current) {
      const videoTrack = previewStream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('🎥 Video track details:', {
          enabled: videoTrack.enabled,
          readyState: videoTrack.readyState,
          muted: videoTrack.muted,
          settings: videoTrack.getSettings()
        });
        
        // Ensure video element has the stream attached
        if (videoRef.current.srcObject !== previewStream) {
          console.log('Re-attaching stream to video element');
          videoRef.current.srcObject = previewStream;
          videoRef.current.play().catch(err => console.log('Video play error:', err));
        }
        // Sync the video element visibility with track enabled state
        console.log('Video track enabled:', videoTrack.enabled, 'State:', isVideoEnabled, 'Ready:', videoReady);
      }
    }
  }, [isVideoEnabled, previewStream, videoReady]);

  const toggleMic = () => {
    if (previewStream) {
      const audioTrack = previewStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (previewStream) {
      const videoTrack = previewStream.getVideoTracks()[0];
      if (videoTrack) {
        const newState = !videoTrack.enabled;
        videoTrack.enabled = newState;
        setIsVideoEnabled(newState);
        console.log('Video toggled:', newState, 'Track enabled:', videoTrack.enabled);
      }
    }
  };

  const handleJoin = () => {
    // Pass the preferences and stop the preview stream
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
    }
    
    onJoin({
      micEnabled: isMicEnabled,
      videoEnabled: isVideoEnabled
    });
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-slate-950 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="max-w-5xl w-full my-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            Ready to join?
          </h1>
          <p className="text-gray-400 text-lg font-medium">
            {meetingTitle || 'Meeting Room'}
          </p>
        </div>

        {/* Video Preview Card */}
        <div className="bg-gradient-to-b from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
          {/* Video Preview */}
          <div className="relative aspect-video bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950">
            {isLoadingMedia ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-blue-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <VideoIcon className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="mt-4 text-gray-400 font-medium">Setting up your devices...</p>
              </div>
            ) : (
              <>
                {/* Always render video element to maintain ref */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                    isVideoEnabled && previewStream?.getVideoTracks().length > 0 && videoReady
                      ? 'opacity-100 z-10'
                      : 'opacity-0 pointer-events-none'
                  }`}
                />
                {/* Show avatar when video is off or not available */}
                {(!isVideoEnabled || !previewStream?.getVideoTracks().length) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-gray-800 to-slate-900">
                    <div className="relative mb-6">
                      <div className="w-32 h-32 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-gray-700/50">
                        <span className="text-5xl font-bold text-white">
                          {userName?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      {/* Ring effect */}
                      <div className="absolute inset-0 w-32 h-32 bg-blue-500/20 rounded-full animate-ping"></div>
                    </div>
                    <p className="text-gray-300 text-lg font-medium">Camera is off</p>
                    <p className="text-gray-500 text-sm mt-1">Turn on camera to see yourself</p>
                  </div>
                )}

                {/* User Name Tag */}
                <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-white text-sm font-semibold">{userName || 'You'}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className={`border-l-4 p-4 ${
              error.startsWith('info:') 
                ? 'bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border-blue-500' 
                : 'bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-yellow-500'
            }`}>
              <div className="flex items-start">
                {error.startsWith('info:') ? (
                  <CheckCircle className="w-5 h-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-medium ${
                    error.startsWith('info:') ? 'text-blue-200' : 'text-yellow-200'
                  }`}>{error.replace('info:', '')}</p>
                  <p className={`text-xs mt-1 ${
                    error.startsWith('info:') ? 'text-blue-300/80' : 'text-yellow-300/80'
                  }`}>You can still join the meeting</p>
                </div>
              </div>
            </div>
          )}

          {/* Controls Section */}
          <div className="p-8 bg-gray-800/50">
            {/* Device Check Status */}
            {!isLoadingMedia && (
              <div className="mb-6 p-4 bg-gray-900/50 rounded-xl border border-gray-700/50">
                <div className="flex items-center justify-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-300 font-medium">
                      {previewStream?.getAudioTracks().length > 0 ? 'Microphone detected' : 'No microphone'}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-gray-700"></div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-300 font-medium">
                      {previewStream?.getVideoTracks().length > 0 ? 'Camera detected' : 'No camera'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Toggle Buttons */}
            <div className="flex justify-center items-center space-x-6 mb-8">
              {/* Microphone Toggle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={toggleMic}
                  disabled={!previewStream?.getAudioTracks().length}
                  className={`relative group w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-lg ${
                    isMicEnabled
                      ? 'bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700'
                      : 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'
                  } ${!previewStream?.getAudioTracks().length ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
                >
                  {isMicEnabled ? (
                    <Mic className="w-7 h-7 text-white" />
                  ) : (
                    <MicOff className="w-7 h-7 text-white" />
                  )}
                  {/* Enhanced Tooltip */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-10">
                    <div className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-xl border border-gray-700 whitespace-nowrap">
                      {isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                </button>
                <span className="mt-3 text-xs text-gray-400 font-medium">
                  {isMicEnabled ? 'Microphone' : 'Muted'}
                </span>
              </div>

              {/* Video Toggle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={toggleVideo}
                  disabled={!previewStream?.getVideoTracks().length}
                  className={`relative group w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-lg ${
                    isVideoEnabled
                      ? 'bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700'
                      : 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'
                  } ${!previewStream?.getVideoTracks().length ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
                >
                  {isVideoEnabled ? (
                    <VideoIcon className="w-7 h-7 text-white" />
                  ) : (
                    <VideoOff className="w-7 h-7 text-white" />
                  )}
                  {/* Enhanced Tooltip */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-10">
                    <div className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-xl border border-gray-700 whitespace-nowrap">
                      {isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                </button>
                <span className="mt-3 text-xs text-gray-400 font-medium">
                  {isVideoEnabled ? 'Camera' : 'Cam Off'}
                </span>
              </div>

              {/* Settings */}
              <div className="flex flex-col items-center">
                <button
                  className="relative group w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 flex items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-lg"
                  title="Settings"
                >
                  <Settings className="w-7 h-7 text-white" />
                  {/* Enhanced Tooltip */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-10">
                    <div className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-xl border border-gray-700 whitespace-nowrap">
                      Device settings
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                </button>
                <span className="mt-3 text-xs text-gray-400 font-medium">Settings</span>
              </div>
            </div>

            {/* Join Button */}
            <div className="flex justify-center">
              <button
                onClick={handleJoin}
                disabled={isLoadingMedia}
                className="group relative bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-bold px-12 py-4 rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:hover:scale-100 border border-blue-500/50 disabled:border-gray-700"
              >
                <span className="flex items-center space-x-2">
                  <VideoIcon className="w-5 h-5" />
                  <span className="text-lg">
                    {isLoadingMedia ? 'Preparing...' : 'Join Meeting'}
                  </span>
                </span>
                {!isLoadingMedia && (
                  <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            Make sure your microphone and camera are working properly before joining
          </p>
        </div>
      </div>
    </div>
  );
};

export default PreJoinScreen;

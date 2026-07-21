import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, MoreVertical, Edit3, Circle, FileText, BarChart3 } from 'lucide-react';

const TestComponent = () => {
  // Basic state management test
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [showChat, setShowChat] = useState(false);
  const [localStream, setLocalStream] = useState(null);

  const localVideoRef = useRef(null);

  // Test media access
  const testMediaAccess = async () => {
    try {
      console.log('🧪 Testing media access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      console.log('✅ Media access successful:', stream);
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('✅ Video stream attached');
      }
    } catch (error) {
      console.error('❌ Media access failed:', error);
    }
  };

  // Test toggle functions
  const testToggleMic = () => {
    console.log('🧪 Testing mic toggle, current:', isMicOn);
    setIsMicOn(!isMicOn);
    console.log('✅ Mic toggled to:', !isMicOn);
    
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        console.log('✅ Audio track enabled:', !isMicOn);
      }
    }
  };

  const testToggleCamera = () => {
    console.log('🧪 Testing camera toggle, current:', isCameraOn);
    setIsCameraOn(!isCameraOn);
    console.log('✅ Camera toggled to:', !isCameraOn);
    
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCameraOn;
        console.log('✅ Video track enabled:', !isCameraOn);
      }
    }
  };

  const testToolsMenu = () => {
    console.log('🧪 Testing tools menu toggle, current:', showToolsMenu);
    setShowToolsMenu(!showToolsMenu);
    console.log('✅ Tools menu toggled to:', !showToolsMenu);
  };

  const testWhiteboard = () => {
    console.log('🧪 Testing whiteboard');
    setShowWhiteboard(true);
    setShowToolsMenu(false);
    console.log('✅ Whiteboard opened');
  };

  const testRecording = () => {
    console.log('🧪 Testing recording toggle, current:', isRecording);
    setIsRecording(!isRecording);
    setShowToolsMenu(false);
    console.log('✅ Recording toggled to:', !isRecording);
  };

  const testNotepad = () => {
    console.log('🧪 Testing notepad');
    setShowChat(true);
    setActiveTab('notepad');
    setShowToolsMenu(false);
    console.log('✅ Notepad opened');
  };

  const testPolls = () => {
    console.log('🧪 Testing polls');
    setShowChat(true);
    setActiveTab('polls');
    setShowToolsMenu(false);
    console.log('✅ Polls opened');
  };

  useEffect(() => {
    console.log('🧪 Test component mounted');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">ProComm Functionality Test</h1>
        
        {/* Media Test Section */}
        <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">Media Access Test</h2>
          <button
            onClick={testMediaAccess}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg mb-4 mr-4"
          >
            Test Camera & Microphone Access
          </button>
          
          <div className="mt-4">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-64 h-48 bg-gray-800 rounded-lg border-2 border-white/20"
            />
          </div>
        </div>

        {/* Controls Test Section */}
        <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">Control Buttons Test</h2>
          
          <div className="flex space-x-4 mb-4">
            {/* Mic Toggle */}
            <button
              onClick={testToggleMic}
              className={`p-4 rounded-2xl transition-all duration-300 ${
                isMicOn 
                  ? 'bg-white/20 hover:bg-white/30 text-white' 
                  : 'bg-red-500/80 hover:bg-red-500 text-white'
              }`}
            >
              {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>

            {/* Camera Toggle */}
            <button
              onClick={testToggleCamera}
              className={`p-4 rounded-2xl transition-all duration-300 ${
                isCameraOn 
                  ? 'bg-white/20 hover:bg-white/30 text-white' 
                  : 'bg-red-500/80 hover:bg-red-500 text-white'
              }`}
            >
              {isCameraOn ? <VideoIcon className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>

            {/* Tools Menu Toggle */}
            <div className="relative">
              <button
                onClick={testToolsMenu}
                className="p-4 bg-white/20 hover:bg-white/30 rounded-2xl transition-all duration-300 text-white"
              >
                <MoreVertical className="w-6 h-6" />
              </button>
              
              {/* Tools Menu */}
              {showToolsMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-black/90 backdrop-blur-xl rounded-2xl p-3 border border-white/20 min-w-48">
                  <button
                    onClick={testWhiteboard}
                    className="w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/10 text-white"
                  >
                    <Edit3 className="w-5 h-5" />
                    <span className="text-sm font-medium">Whiteboard</span>
                  </button>
                  
                  <button
                    onClick={testRecording}
                    className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/10 text-white ${
                      isRecording ? 'bg-red-500/20 text-red-300' : ''
                    }`}
                  >
                    <Circle className={`w-5 h-5 ${isRecording ? 'fill-current animate-pulse' : ''}`} />
                    <span className="text-sm font-medium">
                      {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </span>
                  </button>
                  
                  <div className="w-full h-px bg-white/10 my-2"></div>
                  
                  <button
                    onClick={testNotepad}
                    className="w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/10 text-white"
                  >
                    <FileText className="w-5 h-5" />
                    <span className="text-sm font-medium">Notepad</span>
                  </button>
                  
                  <button
                    onClick={testPolls}
                    className="w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/10 text-white"
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span className="text-sm font-medium">Polls</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Display */}
        <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">Current Status</h2>
          <div className="grid grid-cols-2 gap-4 text-white">
            <div>
              <p><strong>Microphone:</strong> {isMicOn ? '🎤 ON' : '🔇 OFF'}</p>
              <p><strong>Camera:</strong> {isCameraOn ? '📹 ON' : '📷 OFF'}</p>
              <p><strong>Tools Menu:</strong> {showToolsMenu ? '📖 OPEN' : '📕 CLOSED'}</p>
            </div>
            <div>
              <p><strong>Recording:</strong> {isRecording ? '🔴 RECORDING' : '⚪ STOPPED'}</p>
              <p><strong>Whiteboard:</strong> {showWhiteboard ? '🖊️ OPEN' : '📝 CLOSED'}</p>
              <p><strong>Chat Panel:</strong> {showChat ? '💬 OPEN' : '💬 CLOSED'}</p>
              <p><strong>Active Tab:</strong> {activeTab}</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-500/20 backdrop-blur-xl rounded-2xl p-6 mt-6 border border-yellow-500/50">
          <h2 className="text-2xl font-bold text-yellow-200 mb-4">Test Instructions</h2>
          <ol className="text-yellow-100 space-y-2">
            <li>1. <strong>Open browser developer console</strong> (F12) to see detailed logs</li>
            <li>2. Click "Test Camera & Microphone Access" - check console for media logs</li>
            <li>3. Test each control button and watch the console output</li>
            <li>4. Test the More Tools menu and each tool option</li>
            <li>5. Check the status display to verify state changes</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default TestComponent;
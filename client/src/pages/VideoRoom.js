import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  Monitor, 
  MonitorOff,
  Phone,
  MessageSquare,
  Users,
  MoreVertical,
  Camera,
  X,
  Send,
  BarChart3,
  Plus,
  Hand,
  Smile,
  Edit3,
  FileText,
  Circle,
  Download,
  Clock,
  Timer
} from 'lucide-react';
import io from 'socket.io-client';
import Peer from 'peerjs';
import LoadingScreen from '../components/LoadingScreen';
import Whiteboard from '../components/Whiteboard';

const VideoRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userName = searchParams.get('name') || 'Anonymous';
  const userEmail = searchParams.get('email') || '';

  // Video states
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState(new Map());
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [error, setError] = useState('');
  
  // New states for consolidated menus
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  // Chat states
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  
  // Poll states
  const [polls, setPolls] = useState([]);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newPoll, setNewPoll] = useState({
    question: '',
    options: ['', '']
  });
  
  // Meeting features states
  const [handsRaised, setHandsRaised] = useState(new Set());
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Timer states
  const [meetingStartTime] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [meetingDuration, setMeetingDuration] = useState('00:00:00');
  
  // Persistent data states
  const [whiteboardData, setWhiteboardData] = useState(null);
  
  // Active tab in chat panel
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'polls', 'whiteboard', 'notepad'

  // Refs
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const activeCallsRef = useRef(new Map()); // Track active calls for cleanup

  const messagesEndRef = useRef(null);

  // Attach local video stream to video element when stream is available
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log('🎥 Attaching local stream to video element');
      localVideoRef.current.srcObject = localStream;
      
      localVideoRef.current.onloadedmetadata = () => {
        console.log('🎥 Video metadata loaded');
        const playPromise = localVideoRef.current.play?.();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => console.log('✅ Local video playback started'))
            .catch(err => {
              console.warn('⚠️ Video autoplay blocked:', err?.message);
              setTimeout(() => localVideoRef.current?.play?.(), 500);
            });
        }
      };
    }
  }, [localStream]);

  useEffect(() => {
    initializeVideoCall();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    // Load saved notes and whiteboard data from localStorage
    const savedNotes = localStorage.getItem(`meeting-notes-${roomId}`);
    if (savedNotes) {
      setNotes(savedNotes);
    }
    
    const savedWhiteboardData = localStorage.getItem(`meeting-whiteboard-${roomId}`);
    if (savedWhiteboardData) {
      setWhiteboardData(savedWhiteboardData);
    }
  }, [roomId]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Calculate meeting duration
      const duration = now - meetingStartTime;
      const hours = Math.floor(duration / 3600000);
      const minutes = Math.floor((duration % 3600000) / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      
      setMeetingDuration(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [meetingStartTime]);

  // Hide loading screen when initialization is complete and no errors
  useEffect(() => {
    if (!isInitializing && !error) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500); // Small delay to let LoadingScreen animation complete
      
      return () => clearTimeout(timer);
    }
  }, [isInitializing, error]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is on a button that should toggle menus
      const isReactionsButton = event.target.closest('[data-reactions-button]');
      const isToolsButton = event.target.closest('[data-tools-button]');
      const isReactionsMenu = event.target.closest('[data-reactions-menu]');
      const isToolsMenu = event.target.closest('[data-tools-menu]');
      
      // Only close if clicking outside both buttons and menus
      if (!isReactionsButton && !isReactionsMenu && !isToolsButton && !isToolsMenu) {
        if (showReactionsMenu || showToolsMenu) {
          console.log('🔄 Closing menus due to outside click');
          setShowReactionsMenu(false);
          setShowToolsMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showReactionsMenu, showToolsMenu]);

  const initializeVideoCall = async () => {
    try {
      console.log('🚀 Initializing video call...');
      setError(''); // Clear any previous errors
      setIsInitializing(true);
      
      // Validate participant access (isolate network errors from media errors)
      if (userEmail) {
        try {
          console.log('📧 Validating participant access for:', userEmail);
          const response = await fetch(`/api/validate-participant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              meetingId: roomId,
              email: userEmail,
              name: userName
            })
          });

          if (!response.ok) {
            throw new Error(`Validation request failed with status ${response.status}`);
          }

          const validation = await response.json();
          if (!validation.success || !validation.isAllowed) {
            setError(validation.message || 'You are not authorized to join this meeting');
            setIsLoading(false);
            setIsInitializing(false);
            return;
          }
          console.log('✅ Participant validation passed');
        } catch (netErr) {
          console.error('❌ Participant validation failed:', netErr);
          setError('Cannot reach server to validate access. Please check your internet connection and try again.');
          setIsLoading(false);
          setIsInitializing(false);
          return;
        }
      }

      // Check media device permissions first with fallbacks
      console.log('🎥 Requesting camera and microphone access...');
      let stream;
      try {
        // Request high-quality video and audio for better streaming
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, min: 24 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 2
          }
        });
      } catch (errBoth) {
        console.warn('⚠️ getUserMedia(video+audio) failed:', errBoth);
        // Try video-only with quality settings
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              frameRate: { ideal: 30, min: 24 }
            }, 
            audio: false 
          });
          setError('Microphone access failed. You can join with camera only, or check mic permissions.');
        } catch (errVideo) {
          console.warn('⚠️ getUserMedia(video-only) failed:', errVideo);
          // Try audio-only with quality settings
          try {
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: false, 
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 48000
              }
            });
            setError('Camera access failed. You can join with audio only, or check camera permissions.');
          } catch (errAudio) {
            console.error('❌ All media attempts failed:', errAudio);
            throw errBoth; // fall back to outer catch for consistent error messaging below
          }
        }
      }

      console.log('✅ Media access granted:', stream);
      console.log('📹 Video tracks:', stream.getVideoTracks().length, '🎤 Audio tracks:', stream.getAudioTracks().length);
      
      // Log track settings for debugging
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      if (videoTrack) {
        console.log('📷 Video track settings:', videoTrack.getSettings());
        console.log('📷 Video track enabled:', videoTrack.enabled);
        // Ensure video track is enabled by default
        videoTrack.enabled = true;
      }
      if (audioTrack) {
        console.log('🎤 Audio track settings:', audioTrack.getSettings());
        console.log('🎤 Audio track enabled:', audioTrack.enabled);
        // Ensure audio track is enabled by default
        audioTrack.enabled = true;
      }
      
      // Update state based on available tracks
      setIsCameraOn(videoTrack ? videoTrack.enabled : false);
      setIsMicOn(audioTrack ? audioTrack.enabled : false);
      
      setLocalStream(stream);

      // Initialize socket connection (only in development or if server URL is explicitly set)
      const hasSocketServer = process.env.REACT_APP_SERVER_URL && 
        process.env.REACT_APP_SERVER_URL !== window.location.origin;
      
      if (hasSocketServer || process.env.NODE_ENV === 'development') {
        const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3002';
        
        const socketOptions = {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5
        };
        
        console.log('🔌 Connecting to Socket.IO server:', serverUrl);
        socketRef.current = io(serverUrl, socketOptions);
        
        // Socket connection events
        socketRef.current.on('connect', () => {
          console.log('✅ Socket.IO connected successfully!');
        });
        
        socketRef.current.on('connect_error', (error) => {
          console.error('❌ Socket.IO connection error:', error);
          console.warn('⚠️ Falling back to localStorage peer discovery');
        });
        
        socketRef.current.on('disconnect', (reason) => {
          console.warn('⚠️ Socket.IO disconnected:', reason);
        });
      } else {
        console.log('📡 Running without Socket.IO server - using localStorage peer discovery');
        socketRef.current = null;
      }
      
      // Initialize PeerJS (production/development aware)
      const isProduction = process.env.NODE_ENV === 'production';
      const peer = new Peer({
        host: isProduction ? '0.peerjs.com' : 'localhost',
        port: isProduction ? 443 : 3003,
        path: isProduction ? '/' : '/',
        secure: isProduction,
        debug: isProduction ? 0 : 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
          ],
          sdpSemantics: 'unified-plan',
          iceTransportPolicy: 'all',
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require'
        }
      });
      
      peerRef.current = peer;

      peer.on('open', (userId) => {
        console.log('✅ PeerJS connected with ID:', userId);
        
        // Try to join via Socket.IO if available
        if (socketRef.current && socketRef.current.connected) {
          console.log('🔌 Joining meeting via Socket.IO');
          socketRef.current.emit('join-meeting', roomId, userId, userName, userEmail);
        } else {
          console.warn('⚠️ Socket.IO not available, using API-based peer discovery');
          
          // Register this peer and get list of existing peers via API
          const registerPeer = async () => {
            try {
              const response = await fetch(`/api/peer-discovery?meetingId=${roomId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userName, userEmail })
              });
              
              const result = await response.json();
              console.log('📡 Peer discovery response:', result);
              
              if (result.success && result.peers) {
                console.log(`📋 Found ${result.peers.length} existing peer(s)`);
                
                // Call each existing peer
                result.peers.forEach(peerData => {
                  // Prevent duplicate calls
                  if (activeCallsRef.current.has(peerData.userId)) {
                    console.log('⏭️ Skipping duplicate call to:', peerData.userName);
                    return;
                  }
                  
                  console.log('📞 Calling existing peer via API:', peerData.userName);
                  setTimeout(() => {
                    const call = peer.call(peerData.userId, stream, {
                      metadata: { userName, userEmail }
                    });
                    
                    if (call) {
                      activeCallsRef.current.set(peerData.userId, call);
                      
                      call.on('stream', (remoteStream) => {
                        console.log('📹 Received stream from:', peerData.userName);
                        addPeer(peerData.userId, remoteStream, peerData.userName);
                      });
                      
                      call.on('close', () => {
                        console.log('📞 Call closed:', peerData.userName);
                        activeCallsRef.current.delete(peerData.userId);
                        removePeer(peerData.userId);
                      });
                      
                      call.on('error', (err) => {
                        console.error('❌ Call error:', err);
                        activeCallsRef.current.delete(peerData.userId);
                      });
                    }
                  }, 1000);
                });
              }
            } catch (error) {
              console.error('❌ Error registering peer:', error);
            }
          };
          
          registerPeer();
          
          // Poll for new peers every 5 seconds
          const pollInterval = setInterval(async () => {
            try {
              const response = await fetch(`/api/peer-discovery?meetingId=${roomId}`);
              const result = await response.json();
              
              if (result.success && result.peers) {
                const currentPeerIds = Array.from(peers.keys());
                const newPeers = result.peers.filter(p => 
                  p.userId !== userId && !currentPeerIds.includes(p.userId)
                );
                
                newPeers.forEach(peerData => {
                  // Prevent duplicate calls
                  if (activeCallsRef.current.has(peerData.userId)) {
                    return;
                  }
                  
                  console.log('📞 New peer detected via polling:', peerData.userName);
                  const call = peer.call(peerData.userId, stream, {
                    metadata: { userName, userEmail }
                  });
                  
                  if (call) {
                    activeCallsRef.current.set(peerData.userId, call);
                    
                    call.on('stream', (remoteStream) => {
                      console.log('📹 Received stream from new peer:', peerData.userName);
                      addPeer(peerData.userId, remoteStream, peerData.userName);
                    });
                    
                    call.on('close', () => {
                      activeCallsRef.current.delete(peerData.userId);
                      removePeer(peerData.userId);
                    });
                    
                    call.on('error', (err) => {
                      console.error('❌ Call error:', err);
                      activeCallsRef.current.delete(peerData.userId);
                    });
                  }
                });
              }
            } catch (error) {
              console.error('❌ Error polling for peers:', error);
            }
          }, 5000);
          
          // Store interval ID for cleanup
          window.peerPollInterval = pollInterval;
        }
      });

      // Handle incoming calls
      peer.on('call', (call) => {
        console.log('📞 Incoming call from:', call.peer, 'metadata:', call.metadata);
        call.answer(stream);
        activeCallsRef.current.set(call.peer, call);
        
        call.on('stream', (remoteStream) => {
          console.log('📹 Received stream from incoming call:', call.peer);
          addPeer(call.peer, remoteStream, call.metadata?.userName || 'Unknown');
        });
        
        call.on('close', () => {
          console.log('📞 Incoming call closed:', call.peer);
          activeCallsRef.current.delete(call.peer);
          removePeer(call.peer);
        });
        
        call.on('error', (err) => {
          console.error('❌ Incoming call error:', err);
          activeCallsRef.current.delete(call.peer);
        });
      });

      // Socket event listeners (only if Socket.IO is available)
      if (socketRef.current) {
        socketRef.current.on('user-joined', ({ userId, userName: joinedUserName, socketId }) => {
          console.log('👤 User joined:', joinedUserName, 'with userId:', userId);
          // Call the new user
          const call = peer.call(userId, stream, {
            metadata: { userName }
          });
          
          if (call) {
            console.log('📞 Calling new user:', joinedUserName);
            call.on('stream', (remoteStream) => {
              console.log('📹 Received stream from new user:', joinedUserName);
              addPeer(userId, remoteStream, joinedUserName);
            });
            
            call.on('error', (err) => {
              console.error('❌ Call error with new user', joinedUserName, err);
            });
          }
        });

        socketRef.current.on('user-left', ({ userId, userName: leftUserName }) => {
          console.log('User left:', leftUserName);
          removePeer(userId);
        });

        socketRef.current.on('chat-message', (messageData) => {
          setMessages(prev => [...prev, messageData]);
        });

        socketRef.current.on('existing-participants', (participantList) => {
          console.log('📋 Existing participants:', participantList);
          setParticipants(participantList);
          
          // Call each existing participant
          participantList.forEach(participant => {
            console.log('📞 Calling existing participant:', participant.userName);
            const call = peer.call(participant.userId, stream, {
              metadata: { userName }
            });
            
            if (call) {
              call.on('stream', (remoteStream) => {
                console.log('📹 Received stream from:', participant.userName);
                addPeer(participant.userId, remoteStream, participant.userName);
              });
              
              call.on('error', (err) => {
                console.error('❌ Call error with', participant.userName, err);
              });
            }
          });
        });

        // Poll event listeners
        socketRef.current.on('poll-created', (pollData) => {
          const pollWithDate = {
            ...pollData.poll,
            createdAt: new Date(pollData.poll.createdAt)
          };
          setPolls(prev => [...prev, pollWithDate]);
        });

        socketRef.current.on('poll-vote', (pollData) => {
          const pollWithDate = {
            ...pollData.poll,
            createdAt: new Date(pollData.poll.createdAt)
          };
          setPolls(prev => prev.map(poll => 
            poll.id === pollData.poll.id ? pollWithDate : poll
          ));
        });
        
        // Hand raise event listeners
        socketRef.current.on('hand-raised', ({ userName: handUserName, isRaised }) => {
          setHandsRaised(prev => {
            const newSet = new Set(prev);
            if (isRaised) {
              newSet.add(handUserName);
            } else {
              newSet.delete(handUserName);
            }
            return newSet;
          });
        });

        // Reaction event listeners
        socketRef.current.on('reaction', ({ reaction }) => {
          setReactions(prev => [...prev, reaction]);
          setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== reaction.id));
          }, 3000);
        });
      }

      // Mark initialization as complete - let LoadingScreen animation finish
      setIsInitializing(false);
    } catch (error) {
      console.error('❌ Error initializing video call:', error);
      
      let errorMessage = 'Failed to access camera/microphone. Please check permissions.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone access denied. Please allow permissions and refresh.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera/microphone found. Please connect a device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera/microphone is being used by another application.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
      setIsInitializing(false);
    }
  };

  const addPeer = (userId, stream, userName) => {
    setPeers(prevPeers => {
      const newPeers = new Map(prevPeers);
      newPeers.set(userId, { stream, userName });
      return newPeers;
    });
    
    setParticipants(prev => {
      if (!prev.find(p => p.userId === userId)) {
        return [...prev, { userId, userName, userEmail: '' }];
      }
      return prev;
    });
  };

  const removePeer = (userId) => {
    // Close the call connection
    const call = activeCallsRef.current.get(userId);
    if (call) {
      try {
        call.close();
      } catch (err) {
        console.warn('⚠️ Error closing call:', err);
      }
      activeCallsRef.current.delete(userId);
    }
    
    setPeers(prevPeers => {
      const newPeers = new Map(prevPeers);
      const peerData = newPeers.get(userId);
      if (peerData?.stream) {
        peerData.stream.getTracks().forEach(track => track.stop());
      }
      newPeers.delete(userId);
      return newPeers;
    });
    
    setParticipants(prev => prev.filter(p => p.userId !== userId));
  };

  const toggleMic = () => {
    console.log('🎤 Toggle mic clicked, current state:', isMicOn);
    console.log('🎤 Local stream available:', !!localStream);
    
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      console.log('🎤 Audio tracks found:', audioTracks.length);
      
      const audioTrack = audioTracks[0];
      if (audioTrack) {
        console.log('🎤 Audio track before toggle - enabled:', audioTrack.enabled, 'readyState:', audioTrack.readyState);
        const newState = !isMicOn;
        audioTrack.enabled = newState;
        setIsMicOn(newState);
        console.log('🎤 Microphone toggled to:', newState, 'track enabled:', audioTrack.enabled);
        
        // Notify other participants
        if (socketRef.current) {
          socketRef.current.emit('media-state-change', {
            roomId,
            userId: peerRef.current?.id,
            userName,
            type: 'audio',
            enabled: newState
          });
        }
      } else {
        console.warn('⚠️ No audio track found in stream');
      }
    } else {
      console.warn('⚠️ No local stream available for mic toggle');
    }
  };

  const toggleCamera = () => {
    console.log('📹 Toggle camera clicked, current state:', isCameraOn);
    console.log('📹 Local stream available:', !!localStream);
    
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      console.log('📹 Video tracks found:', videoTracks.length);
      
      const videoTrack = videoTracks[0];
      if (videoTrack) {
        console.log('📹 Video track before toggle - enabled:', videoTrack.enabled, 'readyState:', videoTrack.readyState);
        const newState = !isCameraOn;
        videoTrack.enabled = newState;
        setIsCameraOn(newState);
        console.log('📹 Camera toggled to:', newState, 'track enabled:', videoTrack.enabled);
        
        // Notify other participants
        if (socketRef.current) {
          socketRef.current.emit('media-state-change', {
            roomId,
            userId: peerRef.current?.id,
            userName,
            type: 'video',
            enabled: newState
          });
        }
      } else {
        console.warn('⚠️ No video track found in stream');
      }
    } else {
      console.warn('⚠️ No local stream available for camera toggle');
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        setIsScreenSharing(true);
        
        // Replace video track for all peer connections
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          // Switch back to camera
          if (localStream) {
            // This would need to be implemented to switch back
          }
        };
        
        socketRef.current?.emit('start-screen-share');
      } else {
        // Stop screen sharing
        setIsScreenSharing(false);
        socketRef.current?.emit('stop-screen-share');
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  const sendMessage = () => {
    console.log('💬 Sending message:', newMessage.trim());
    console.log('💬 Socket available:', !!socketRef.current);
    
    if (newMessage.trim() && socketRef.current) {
      socketRef.current.emit('chat-message', {
        roomId,
        message: newMessage.trim()
      });
      console.log('💬 Chat message sent to server');
      setNewMessage('');
    } else {
      console.warn('⚠️ Cannot send message - no socket or empty message');
    }
  };

  // Poll functions
  const createPoll = () => {
    if (newPoll.question.trim() && newPoll.options.every(opt => opt.trim())) {
      const poll = {
        id: Date.now(),
        question: newPoll.question,
        options: newPoll.options.map((option, index) => ({
          id: index,
          text: option,
          votes: []
        })),
        createdBy: userName,
        createdAt: new Date(),
        isActive: true
      };
      
      setPolls(prev => [...prev, poll]);
      
      if (socketRef.current) {
        socketRef.current.emit('poll-created', { roomId, poll });
      }
      
      setNewPoll({ question: '', options: ['', ''] });
      setShowCreatePoll(false);
    }
  };

  const votePoll = (pollId, optionId) => {
    setPolls(prev => prev.map(poll => {
      if (poll.id === pollId) {
        const updatedOptions = poll.options.map(option => {
          if (option.id === optionId) {
            return {
              ...option,
              votes: option.votes.includes(userName) 
                ? option.votes 
                : [...option.votes, userName]
            };
          } else {
            return {
              ...option,
              votes: option.votes.filter(voter => voter !== userName)
            };
          }
        });
        
        const updatedPoll = { ...poll, options: updatedOptions };
        
        if (socketRef.current) {
          socketRef.current.emit('poll-vote', { roomId, poll: updatedPoll });
        }
        
        return updatedPoll;
      }
      return poll;
    }));
  };

  const addPollOption = () => {
    if (newPoll.options.length < 5) {
      setNewPoll(prev => ({
        ...prev,
        options: [...prev.options, '']
      }));
    }
  };

  const removePollOption = (index) => {
    if (newPoll.options.length > 2) {
      setNewPoll(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  // Raise hand functions
  const toggleRaiseHand = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    
    if (socketRef.current) {
      socketRef.current.emit('hand-raised', {
        roomId,
        userName,
        isRaised: newState
      });
    }
  };

  // Reaction functions
  const sendReaction = (emoji) => {
    console.log('😀 Sending reaction:', emoji);
    const reaction = {
      id: Date.now(),
      emoji,
      userName,
      timestamp: Date.now()
    };
    
    setReactions(prev => [...prev, reaction]);
    console.log('😀 Reaction added locally:', reaction);
    
    if (socketRef.current) {
      socketRef.current.emit('reaction', { roomId, reaction });
      console.log('😀 Reaction sent to server');
    } else {
      console.warn('⚠️ Socket not available for reaction');
    }
    
    // Remove reaction after 3 seconds
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reaction.id));
    }, 3000);
  };

  // Notes functions
  const saveNotes = () => {
    localStorage.setItem(`meeting-notes-${roomId}`, notes);
    // Show success message (you could add a toast here)
  };

  // Auto-save notes when they change
  useEffect(() => {
    if (notes) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(`meeting-notes-${roomId}`, notes);
      }, 1000); // Auto-save after 1 second of inactivity
      
      return () => clearTimeout(timeoutId);
    }
  }, [notes, roomId]);

  // Save whiteboard data function
  const saveWhiteboardData = (data) => {
    setWhiteboardData(data);
    localStorage.setItem(`meeting-whiteboard-${roomId}`, data);
  };

  const exportNotes = () => {
    const blob = new Blob([notes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-notes-${roomId}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearNotes = () => {
    if (window.confirm('Are you sure you want to clear all notes?')) {
      setNotes('');
      localStorage.removeItem(`meeting-notes-${roomId}`);
    }
  };

  const leaveMeeting = () => {
    // Clear saved meeting data
    localStorage.removeItem(`meeting-notes-${roomId}`);
    localStorage.removeItem(`meeting-whiteboard-${roomId}`);
    
    cleanup();
    navigate('/');
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up connections...');
    
    // Close all active calls first
    activeCallsRef.current.forEach((call, userId) => {
      try {
        call.close();
        console.log('📞 Closed call to:', userId);
      } catch (err) {
        console.warn('⚠️ Error closing call:', err);
      }
    });
    activeCallsRef.current.clear();
    
    // Stop all peer streams
    peers.forEach((peerData) => {
      if (peerData.stream) {
        peerData.stream.getTracks().forEach(track => track.stop());
      }
    });
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Clean up peer polling interval
    if (window.peerPollInterval) {
      clearInterval(window.peerPollInterval);
    }
    
    // Clean up peer data from API
    if (roomId && peerRef.current) {
      try {
        fetch(`/api/peer-discovery?meetingId=${roomId}&userId=${peerRef.current.id}`, {
          method: 'DELETE'
        }).catch(err => console.error('Error removing peer from API:', err));
      } catch (e) {
        console.error('Error cleaning up peer data:', e);
      }
    }
    
    if (socketRef.current) {
      socketRef.current.emit('leave-meeting');
      socketRef.current.disconnect();
    }
    
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    
    console.log('✅ Cleanup complete');
  };

  if (isLoading) {
    return (
      <LoadingScreen
        onComplete={() => {
          // Only hide loading if initialization is complete
          if (!isInitializing) {
            setIsLoading(false);
          }
        }}
        message={`Joining meeting room ${roomId}...`}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center bg-red-600/20 border border-red-600 rounded-lg p-8 max-w-md w-full">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-white text-lg font-semibold mb-2">Unable to Join Meeting</h3>
          <p className="text-red-200 mb-6 leading-relaxed">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setError('');
                setIsLoading(true);
                setIsInitializing(false);
                initializeVideoCall();
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col overflow-hidden">
      
      {/* Modern Header - Mobile Responsive */}
      <div className="bg-black/40 backdrop-blur-md border-b border-white/10 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Logo and Title */}
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <div className="bg-blue-600/20 p-2 rounded-xl backdrop-blur-sm flex-shrink-0">
              <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-sm sm:text-lg text-white truncate">Meeting Room</h1>
              <p className="text-xs sm:text-sm text-gray-300 truncate">ID: {roomId.slice(-8)}</p>
            </div>
          </div>
          
          {/* Center Section - Timer and Clock (Hidden on mobile) */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/10">
              <div className="flex items-center space-x-2">
                <Timer className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-mono text-white">{meetingDuration}</span>
              </div>
            </div>
            <div className="bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/10">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-green-400" />
                <span className="text-sm font-mono text-white">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        
          {/* Right Section - Action Buttons */}
          <div className="flex items-center space-x-1 sm:space-x-3">
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/10"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-medium">{participants.length + 1}</span>
          </button>
          
          <button
            onClick={() => setShowChat(!showChat)}
            className={`relative flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-xl transition-all duration-300 backdrop-blur-sm border ${
              showChat 
                ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' 
                : 'bg-white/10 hover:bg-white/20 border-white/10'
            }`}
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-medium hidden sm:inline">Chat</span>
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center animate-pulse text-xs">
                {messages.length > 9 ? '9+' : messages.length}
              </span>
            )}
          </button>
          
          <button
            onClick={toggleRaiseHand}
            className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-xl transition-all duration-300 backdrop-blur-sm border ${
              isHandRaised 
                ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300 animate-pulse' 
                : 'bg-white/10 hover:bg-white/20 border-white/10'
            }`}
            title="Raise hand"
          >
            <Hand className={`w-4 h-4 sm:w-5 sm:h-5 ${isHandRaised ? 'animate-bounce' : ''}`} />
            <span className="text-xs sm:text-sm font-medium hidden sm:inline">Raise Hand</span>
          </button>
        </div>
      </div>

      {/* Main Content - Mobile Responsive Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Video Grid */}
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 h-full">
            
            {/* Local Video */}
            <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group hover:border-blue-500/30 transition-all duration-500">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Hand Raised Indicator */}
              {isHandRaised && (
                <div className="absolute top-4 left-4 bg-yellow-500/90 backdrop-blur-sm p-2 rounded-xl border border-yellow-400/30 animate-pulse">
                  <Hand className="w-5 h-5 text-white animate-bounce" />
                </div>
              )}

              {/* User Info */}
              <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-black/70 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-2 rounded-xl border border-white/20 flex items-center space-x-1 sm:space-x-2">
                <span className="text-xs sm:text-sm font-medium text-white">You ({userName})</span>
                {isHandRaised && (
                  <div className="text-yellow-400">
                    ✋
                  </div>
                )}
              </div>
              
              {/* Status Indicators */}
              <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex space-x-1 sm:space-x-2">
                {!isMicOn && (
                  <div className="bg-red-500/90 backdrop-blur-sm p-1 sm:p-2 rounded-xl border border-red-400/30 animate-pulse">
                    <MicOff className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                )}
                {!isCameraOn && (
                  <div className="bg-red-500/90 backdrop-blur-sm p-1 sm:p-2 rounded-xl border border-red-400/30 animate-pulse">
                    <VideoOff className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                )}
                {isScreenSharing && (
                  <div className="bg-green-500/90 backdrop-blur-sm p-2 rounded-xl border border-green-400/30 animate-pulse">
                    <Monitor className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>

            {/* Remote Videos */}
            {Array.from(peers.entries()).map(([peerId, peerData]) => (
              <RemoteVideo 
                key={peerId} 
                stream={peerData.stream} 
                userName={peerData.userName} 
                handsRaised={handsRaised}
              />
            ))}
          </div>
        </div>

        {/* Floating Reactions */}
        <div className="absolute top-0 left-0 right-0 bottom-20 pointer-events-none z-10 overflow-hidden">
          {reactions.map((reaction) => (
            <div
              key={reaction.id}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 80 + 10}%`,
                top: `${Math.random() * 60 + 20}%`,
                animationDuration: '3s',
                animationFillMode: 'forwards'
              }}
            >
              <div className="bg-black/70 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20 flex items-center space-x-2">
                <span className="text-2xl">{reaction.emoji}</span>
                <span className="text-xs text-white font-medium">{reaction.userName}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Meeting Sidebar */}
        {showChat && (
          <div className="w-full lg:w-96 bg-gray-900/95 backdrop-blur-sm border-l lg:border-l border-t lg:border-t-0 border-white/10 flex flex-col h-full max-h-[calc(100vh-200px)]">
            {/* Tab Navigation */}
            <div className="border-b border-white/10">
              <div className="flex">
                {[
                  { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" />, badge: messages.length },
                  { id: 'polls', label: 'Polls', icon: <BarChart3 className="w-4 h-4" />, badge: polls.length },
                  { id: 'notepad', label: 'Notes', icon: <FileText className="w-4 h-4" /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center space-x-2 p-4 transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-blue-500/20 border-b-2 border-blue-500 text-blue-300'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.icon}
                    <span className="text-sm font-medium">{tab.label}</span>
                    {tab.badge > 0 && (
                      <span className="bg-blue-500 text-xs px-1.5 py-0.5 rounded-full">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <>
                  <div className="p-4 border-b border-white/10">
                    <h3 className="font-semibold text-white">Meeting Chat</h3>
                    <p className="text-sm text-gray-300 mt-1">{participants.length + 1} participants</p>
                  </div>
                  
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all duration-300">
                          <div className="font-semibold text-sm text-blue-300 mb-1">{message.userName}</div>
                          <div className="text-sm text-white leading-relaxed">{message.message}</div>
                          <div className="text-xs text-gray-400 mt-2">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  <div className="p-4 border-t border-white/10">
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Polls Tab */}
              {activeTab === 'polls' && (
                <>
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Live Polls</h3>
                    <button
                      onClick={() => setShowCreatePoll(!showCreatePoll)}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm transition-colors duration-300 flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create</span>
                    </button>
                  </div>
                  
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-0">
                    {showCreatePoll && (
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <h4 className="text-sm font-medium text-white mb-3">Create New Poll</h4>
                        <input
                          type="text"
                          value={newPoll.question}
                          onChange={(e) => setNewPoll(prev => ({ ...prev, question: e.target.value }))}
                          placeholder="Enter your question..."
                          className="w-full bg-white/10 text-white placeholder-gray-400 px-3 py-2 rounded-lg mb-3 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                        <div className="space-y-2 mb-3">
                          {newPoll.options.map((option, index) => (
                            <div key={index} className="flex space-x-2">
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...newPoll.options];
                                  newOptions[index] = e.target.value;
                                  setNewPoll(prev => ({ ...prev, options: newOptions }));
                                }}
                                placeholder={`Option ${index + 1}`}
                                className="flex-1 bg-white/10 text-white placeholder-gray-400 px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              />
                              {newPoll.options.length > 2 && (
                                <button
                                  onClick={() => removePollOption(index)}
                                  className="text-red-400 hover:text-red-300 p-2"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          {newPoll.options.length < 5 && (
                            <button
                              onClick={addPollOption}
                              className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Option</span>
                            </button>
                          )}
                          <div className="flex-1"></div>
                          <button
                            onClick={() => setShowCreatePoll(false)}
                            className="bg-gray-600 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-sm transition-colors duration-300"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={createPoll}
                            className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm transition-colors duration-300"
                          >
                            Create Poll
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {polls.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No polls yet. Create one to get started!</p>
                      </div>
                    ) : (
                      polls.map((poll) => (
                        <div key={poll.id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                          <h4 className="font-medium text-white mb-3">{poll.question}</h4>
                          <div className="space-y-2">
                            {poll.options.map((option) => {
                              const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
                              const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
                              const hasVoted = option.votes.includes(userName);
                              
                              return (
                                <button
                                  key={option.id}
                                  onClick={() => votePoll(poll.id, option.id)}
                                  className={`w-full text-left p-3 rounded-lg border transition-all duration-300 ${
                                    hasVoted
                                      ? 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">{option.text}</span>
                                    <span className="text-xs">{percentage.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-white/10 rounded-full h-2">
                                    <div 
                                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    {option.votes.length} vote{option.votes.length !== 1 ? 's' : ''}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          <div className="text-xs text-gray-400 mt-3">
                            Created by {poll.createdBy} • {new Date(poll.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* Notepad Tab */}
              {activeTab === 'notepad' && (
                <>
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Meeting Notes</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={saveNotes}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-sm transition-colors duration-300"
                      >
                        Save
                      </button>
                      <button
                        onClick={exportNotes}
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm transition-colors duration-300 flex items-center space-x-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                      </button>
                      <button
                        onClick={clearNotes}
                        className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg text-sm transition-colors duration-300"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-4">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Take notes during the meeting..."
                      className="w-full h-full bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 p-4 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 resize-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

    </div>

    {/* Fixed Bottom Control Bar - Mobile Responsive - OUTSIDE main container */}
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 p-3 sm:p-4 z-50">
      <div className="flex items-center justify-center space-x-2 sm:space-x-4 max-w-2xl mx-auto">
          <button
            onClick={toggleMic}
            className={`group relative p-3 sm:p-4 rounded-2xl transition-all duration-300 transform active:scale-95 hover:scale-105 ${
              isMicOn 
                ? 'bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30' 
                : 'bg-red-500/80 hover:bg-red-500 backdrop-blur-sm border border-red-400/50'
            }`}
            title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block">
              <div className="bg-black/90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap">
                {isMicOn ? 'Mute' : 'Unmute'}
              </div>
            </div>
          </button>
          
          <button
            onClick={toggleCamera}
            className={`group relative p-3 sm:p-4 rounded-2xl transition-all duration-300 transform active:scale-95 hover:scale-105 ${
              isCameraOn 
                ? 'bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30' 
                : 'bg-red-500/80 hover:bg-red-500 backdrop-blur-sm border border-red-400/50'
            }`}
            title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isCameraOn ? <VideoIcon className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block">
              <div className="bg-black/90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap">
                {isCameraOn ? 'Stop video' : 'Start video'}
              </div>
            </div>
          </button>
          
          <button
            onClick={toggleScreenShare}
            className={`group relative p-3 sm:p-4 rounded-2xl transition-all duration-300 transform active:scale-95 hover:scale-105 ${
              isScreenSharing 
                ? 'bg-green-500/80 hover:bg-green-500 backdrop-blur-sm border border-green-400/50' 
                : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block">
              <div className="bg-black/90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap">
                {isScreenSharing ? 'Stop sharing' : 'Share screen'}
              </div>
            </div>
          </button>
          
          {/* Reactions Button */}
          <div className="relative">
            <button
              data-reactions-button="true"
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling
                console.log('😀 Reactions button clicked, current state:', showReactionsMenu);
                setShowReactionsMenu(!showReactionsMenu);
                console.log('😀 Reactions menu toggled to:', !showReactionsMenu);
              }}
              onMouseDown={(e) => {
                console.log('😀 Reactions button mouse down event');
              }}
              className="group relative p-3 sm:p-4 bg-white/20 hover:bg-white/30 rounded-2xl transition-all duration-300 transform active:scale-95 hover:scale-105 backdrop-blur-sm border border-white/30"
              title="Reactions"
            >
              <Smile className="w-6 h-6" />
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block">
                <div className="bg-black/90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap">
                  Reactions
                </div>
              </div>
            </button>
            
            {/* Reactions Menu */}
            {showReactionsMenu && (
              <div 
                data-reactions-menu="true"
                className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-xl rounded-2xl p-3 border border-white/20 flex space-x-2"
              >
                {['👍', '❤️', '😂', '👏', '🎉', '😮', '😢', '🔥'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      console.log('😀 Reaction emoji clicked:', emoji);
                      sendReaction(emoji);
                      setShowReactionsMenu(false);
                      console.log('😀 Reactions menu closed after sending reaction');
                    }}
                    className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 transform hover:scale-110"
                    title={`React with ${emoji}`}
                  >
                    <span className="text-xl">{emoji}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* More Tools Button */}
          <div className="relative">
            <button
              data-tools-button="true"
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling
                console.log('⚙️ More Tools button clicked, current state:', showToolsMenu);
                setShowToolsMenu(!showToolsMenu);
                console.log('⚙️ Tools menu toggled to:', !showToolsMenu);
              }}
              onMouseDown={(e) => {
                console.log('⚙️ More Tools button mouse down event');
              }}
              className="group relative p-3 sm:p-4 bg-white/20 hover:bg-white/30 rounded-2xl transition-all duration-300 transform active:scale-95 hover:scale-105 backdrop-blur-sm border border-white/30"
              title="More Tools"
            >
              <MoreVertical className="w-6 h-6" />
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block">
                <div className="bg-black/90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap">
                  More Tools
                </div>
              </div>
            </button>
            
            {/* Tools Menu */}
            {showToolsMenu && (
              <div 
                data-tools-menu="true"
                className="absolute bottom-full mb-2 right-0 bg-black/90 backdrop-blur-xl rounded-2xl p-3 border border-white/20 min-w-48"
              >
                <button
                  onClick={() => {
                    console.log('🖊️ Whiteboard clicked, current state:', showWhiteboard);
                    setShowWhiteboard(true);
                    setShowToolsMenu(false);
                    console.log('🖊️ Whiteboard state set to true, new state should be:', true);
                    // Force a re-render check
                    setTimeout(() => {
                      console.log('🖊️ Whiteboard state after timeout:', showWhiteboard);
                    }, 100);
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/10"
                >
                  <Edit3 className="w-5 h-5" />
                  <span className="text-sm font-medium">Whiteboard</span>
                </button>
                
                <button
                  onClick={() => {
                    console.log('🔴 Recording clicked, current state:', isRecording);
                    setIsRecording(!isRecording);
                    setShowToolsMenu(false);
                    console.log('🔴 Recording state toggled to:', !isRecording);
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/10 ${
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
                  onClick={() => {
                    console.log('📝 Notepad clicked, current showChat:', showChat, 'activeTab:', activeTab);
                    setShowChat(true);
                    setActiveTab('notepad');
                    setShowToolsMenu(false);
                    console.log('📝 Chat panel state set to:', true, 'activeTab set to: notepad');
                    // Force a re-render check
                    setTimeout(() => {
                      console.log('📝 After timeout - showChat:', showChat, 'activeTab:', activeTab);
                    }, 100);
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/10"
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-sm font-medium">Notepad</span>
                </button>
                
                <button
                  onClick={() => {
                    console.log('📊 Polls clicked');
                    setShowChat(true);
                    setActiveTab('polls');
                    setShowToolsMenu(false);
                    console.log('📊 Chat panel opened with polls tab');
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/10"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-sm font-medium">Polls</span>
                </button>
              </div>
            )}
          </div>
          
          <div className="w-px h-8 bg-white/20 mx-2"></div>
          
          <button
            onClick={leaveMeeting}
            className="group relative p-3 sm:p-4 bg-red-500/80 hover:bg-red-500 rounded-2xl transition-all duration-300 transform active:scale-95 hover:scale-105 backdrop-blur-sm border border-red-400/50"
            title="Leave meeting"
          >
            <Phone className="w-6 h-6 transform rotate-[135deg]" />
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block">
              <div className="bg-black/90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap">
                Leave meeting
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Whiteboard Modal */}
      <Whiteboard 
        isOpen={showWhiteboard} 
        onClose={() => {
          console.log('🖊️ Whiteboard onClose called');
          setShowWhiteboard(false);
        }}
        initialData={whiteboardData}
        onSave={saveWhiteboardData}
      />
    </div>
  );
};

const RemoteVideo = ({ stream, userName, handsRaised = new Set() }) => {
  const videoRef = useRef(null);
  const isHandRaised = handsRaised.has(userName);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group hover:border-blue-500/30 transition-all duration-500">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Hand Raised Indicator */}
      {isHandRaised && (
        <div className="absolute top-4 right-4 bg-yellow-500/90 backdrop-blur-sm p-2 rounded-xl border border-yellow-400/30 animate-pulse">
          <Hand className="w-5 h-5 text-white animate-bounce" />
        </div>
      )}
      
      {/* User Info */}
      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 flex items-center space-x-2">
        <span className="text-sm font-medium text-white">{userName}</span>
        {isHandRaised && (
          <div className="text-yellow-400">
            ✋
          </div>
        )}
      </div>
      
      {/* Connection Status */}
      <div className="absolute top-4 left-4 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
    </div>
  );
};

export default VideoRoom;
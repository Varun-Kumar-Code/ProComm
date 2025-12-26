import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Timer,
  Pin,
  PinOff,
  Reply,
  ShieldAlert
} from 'lucide-react';
// import io from 'socket.io-client'; // DISABLED - using HTTP polling
import Peer from 'peerjs';
import LoadingScreen from '../components/LoadingScreen';
import Whiteboard from '../components/Whiteboard';
import { useAuth } from '../context/AuthContext';
import { validateMeetingParticipant, getUserProfile, addParticipantToMeeting } from '../firebase/firestoreService';

const VideoRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  
  // User info states - will be populated from auth or URL params
  const [userName, setUserName] = useState(searchParams.get('name') || '');
  const [userEmail, setUserEmail] = useState(searchParams.get('email') || '');
  const [userProfilePic, setUserProfilePic] = useState(searchParams.get('profilePic') || '');
  
  // Access control states
  const [isValidating, setIsValidating] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState('');

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
  const [replyTo, setReplyTo] = useState(null);
  const [participants, setParticipants] = useState([]);
  
  // Poll states
  const [polls, setPolls] = useState([]);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newPoll, setNewPoll] = useState({
    question: '',
    options: ['', '']
  });
  const [pollVotes, setPollVotes] = useState({}); // Track user's votes by poll ID
  
  // Meeting features states
  const [handsRaised, setHandsRaised] = useState(new Set()); // Set of peer IDs (not userNames)
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Pin state
  const [pinnedParticipant, setPinnedParticipant] = useState(null); // stores peerId or 'local'
  
  // Meeting title state
  const [meetingTitle, setMeetingTitle] = useState('');
  
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

  // Sort participants by priority (active first - camera/mic on)
  const getSortedParticipants = useCallback(() => {
    const participantsList = Array.from(peers.entries());
    
    return participantsList.sort(([idA, dataA], [idB, dataB]) => {
      // Pinned participant always first
      if (pinnedParticipant && pinnedParticipant !== 'local') {
        if (idA === pinnedParticipant) return -1;
        if (idB === pinnedParticipant) return 1;
      }
      
      // Active participants (with stream) come first
      const aHasStream = !!dataA.stream;
      const bHasStream = !!dataB.stream;
      
      if (aHasStream && !bHasStream) return -1;
      if (!aHasStream && bHasStream) return 1;
      
      return 0;
    });
  }, [peers, pinnedParticipant]);

  // Calculate dynamic grid layout based on participant count (Google Meet style)
  const getGridLayout = () => {
    const totalParticipants = participants.length + 1; // +1 for local user
    const hasPinned = !!pinnedParticipant;
    
    let gridClass = '';
    let containerClass = '';
    let pinnedClass = '';
    let gridVideoClass = '';
    
    if (hasPinned) {
      // Pinned layout: Large pinned video (90%) + small thumbnails (10%)
      containerClass = 'w-full h-full flex flex-col gap-2 p-2 transition-all duration-300 ease-in-out';
      pinnedClass = 'w-full flex-1 min-h-0 flex items-center justify-center'; // Center the pinned video
      gridClass = 'flex flex-wrap gap-2 h-20 overflow-x-auto flex-shrink-0'; // Smaller thumbnails
      gridVideoClass = 'h-full aspect-video flex-shrink-0';
      return { gridClass, containerClass, singleVideoClass: null, pinnedClass, gridVideoClass, hasPinned, totalParticipants };
    }
    
    if (totalParticipants === 1) {
      // Solo: Large centered video
      gridClass = '';
      containerClass = 'flex items-center justify-center w-full h-full p-3 transition-all duration-300 ease-in-out';
      return { 
        gridClass, 
        containerClass, 
        singleVideoClass: 'w-full max-w-5xl aspect-video',
        hasPinned,
        totalParticipants
      };
    } else if (totalParticipants === 2) {
      // 2 people: Side by side, centered
      gridClass = 'flex flex-wrap gap-3 justify-center items-center w-full transition-all duration-300 ease-in-out';
      containerClass = 'w-full h-full p-2 flex items-center justify-center transition-all duration-300 ease-in-out';
    } else if (totalParticipants === 3) {
      // 3 people: Responsive grid, centered
      gridClass = 'flex flex-wrap gap-3 justify-center items-center w-full transition-all duration-300 ease-in-out';
      containerClass = 'w-full h-full p-2 flex items-center justify-center transition-all duration-300 ease-in-out';
    } else if (totalParticipants === 4) {
      // 4 people: Perfect 2x2, centered
      gridClass = 'flex flex-wrap gap-3 justify-center items-center w-full max-w-full transition-all duration-300 ease-in-out';
      containerClass = 'w-full h-full p-2 flex items-center justify-center transition-all duration-300 ease-in-out';
    } else if (totalParticipants <= 6) {
      // 5-6 people: 2x3 or 3x2 grid, centered
      gridClass = 'flex flex-wrap gap-3 justify-center items-center w-full transition-all duration-300 ease-in-out';
      containerClass = 'w-full h-full p-2 flex items-center justify-center transition-all duration-300 ease-in-out';
    } else {
      // 7+ people: Scrollable grid
      gridClass = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 w-full auto-rows-max content-start transition-all duration-300 ease-in-out';
      containerClass = 'w-full h-full p-1 overflow-y-auto transition-all duration-300 ease-in-out';
    }
    
    return { gridClass, containerClass, singleVideoClass: null, hasPinned, totalParticipants };
  };

  // Helper function to get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // Helper function to get avatar color based on name
  const getAvatarColor = (name) => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-red-500 to-red-600',
      'bg-gradient-to-br from-orange-500 to-orange-600',
      'bg-gradient-to-br from-yellow-500 to-yellow-600',
      'bg-gradient-to-br from-green-500 to-green-600',
      'bg-gradient-to-br from-teal-500 to-teal-600',
      'bg-gradient-to-br from-cyan-500 to-cyan-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const { gridClass, containerClass, singleVideoClass, pinnedClass, gridVideoClass, hasPinned, totalParticipants } = getGridLayout();

  // Callback ref for local video - fires when element mounts
  const localVideoCallbackRef = useCallback((videoElement) => {
    localVideoRef.current = videoElement;
    
    if (!videoElement || !localStream) {
      console.log('📹 Video callback - element:', !!videoElement, 'stream:', !!localStream);
      return;
    }
    
    console.log('🎥 Video element mounted! Attaching stream...');
    videoElement.srcObject = localStream;
    
    const playPromise = videoElement.play();
    if (playPromise) {
      playPromise
        .then(() => console.log('✅ Local video playing'))
        .catch(err => console.warn('⚠️ Play failed:', err.message));
    }
  }, [localStream]);

  // Validate user access and get user profile on mount
  useEffect(() => {
    const validateAccess = async () => {
      setIsValidating(true);
      
      // Check if user is authenticated
      if (!currentUser) {
        setAccessDenied(true);
        setAccessDeniedReason('You must be logged in to join this meeting. Please sign in first.');
        setIsValidating(false);
        return;
      }

      try {
        // Get user profile from Firestore
        const profile = await getUserProfile(currentUser.uid);
        
        // Set user info from profile or auth
        const displayName = profile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
        setUserName(displayName);
        setUserEmail(currentUser.email || '');
        setUserProfilePic(profile?.profilePicUrl || currentUser.photoURL || '');

        // Validate if user is allowed to join this meeting
        const validation = await validateMeetingParticipant(roomId, currentUser.email);
        
        if (!validation.isAllowed) {
          setAccessDenied(true);
          setAccessDeniedReason(validation.reason);
          setIsValidating(false);
          return;
        }

        // Add participant to meeting
        await addParticipantToMeeting(roomId, {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: displayName,
          profilePicUrl: profile?.profilePicUrl || currentUser.photoURL || ''
        });

        // Set meeting title from validation result
        if (validation.meeting?.title) {
          setMeetingTitle(validation.meeting.title);
        }

        setIsValidating(false);
      } catch (error) {
        console.error('Error validating access:', error);
        // If meeting not found in Firestore, it might be an old/direct link - allow with warning
        // Or deny access based on your requirements
        setAccessDenied(true);
        setAccessDeniedReason('Unable to validate meeting access. The meeting may not exist or has expired.');
        setIsValidating(false);
      }
    };

    validateAccess();
  }, [currentUser, roomId]);

  // Attach local video stream to video element when stream is available
  useEffect(() => {
    console.log('🔄 useEffect triggered - localStream:', !!localStream, 'videoRef:', !!localVideoRef.current);
    
    // Wait for both stream and video element to be ready
    if (!localStream || !localVideoRef.current) {
      console.log('⏸️ Waiting for stream or video element...');
      return;
    }
    
    const videoElement = localVideoRef.current;
    
    console.log('🎥 Attaching local stream to video element');
    console.log('📹 Stream tracks:', localStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
    
    // Set srcObject
    videoElement.srcObject = localStream;
    console.log('✅ srcObject set successfully');
    
    // Function to play video
    const playVideo = () => {
      console.log('🎬 Playing local video...');
      const playPromise = videoElement.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Local video is now playing');
          })
          .catch(err => {
            console.error('❌ Video play failed:', err);
            console.log('💡 Try clicking on your video box');
          });
      }
    };
    
    // Set up event handlers
    const handleLoadedMetadata = () => {
      console.log('📹 Video metadata loaded');
      playVideo();
    };
    
    const handleCanPlay = () => {
      console.log('📹 Video can play');
      playVideo();
    };
    
    const handleClick = () => {
      console.log('👆 Video clicked');
      playVideo();
    };
    
    // Add event listeners
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('click', handleClick);
    
    // Try to play immediately
    if (videoElement.readyState >= 2) {
      console.log('📹 Video already has metadata');
      playVideo();
    } else {
      // Small delay to ensure everything is ready
      setTimeout(playVideo, 300);
    }
    
    // Cleanup
    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('click', handleClick);
    };
  }, [localStream]); // Only depend on localStream

  // Initialize video call ONLY after validation succeeds
  useEffect(() => {
    // Don't initialize if still validating or access is denied
    if (isValidating || accessDenied) {
      return;
    }
    
    initializeVideoCall();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValidating, accessDenied]);

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

  // Get meeting title from URL params or localStorage
  useEffect(() => {
    const title = searchParams.get('title') || localStorage.getItem(`meeting_title_${roomId}`) || 'Untitled Meeting';
    setMeetingTitle(title);
    
    // Save to localStorage for future reference
    if (searchParams.get('title')) {
      localStorage.setItem(`meeting_title_${roomId}`, title);
    }
  }, [searchParams, roomId]);

  // Heartbeat to keep hand raise alive in serverless function (every 10 seconds)
  useEffect(() => {
    if (!roomId || !peerRef.current?.id) return;
    
    const sendHandRaiseHeartbeat = async () => {
      if (!isHandRaised || !peerRef.current?.id) {
        return; // Only send if hand is raised and we have a peer ID
      }
      
      try {
        const serverUrl = process.env.NODE_ENV === 'production' 
          ? window.location.origin 
          : 'http://localhost:3000';
        
        await fetch(`${serverUrl}/api/socket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            roomId, 
            handRaise: { 
              peerId: peerRef.current.id, 
              userName: userName,
              isRaised: true 
            }
          })
        });
        console.log('💓 [HEARTBEAT] Hand raise status refreshed for ID:', peerRef.current.id);
      } catch (error) {
        console.error('❌ [HEARTBEAT] Failed:', error);
      }
    };
    
    // Send heartbeat every 10 seconds
    const interval = setInterval(sendHandRaiseHeartbeat, 10000);
    
    return () => clearInterval(interval);
  }, [roomId, userName, isHandRaised]);

  // Heartbeat for polls - resend polls to keep them alive on server
  useEffect(() => {
    if (!roomId || polls.length === 0) return;
    
    const sendPollsHeartbeat = async () => {
      try {
        const serverUrl = process.env.NODE_ENV === 'production' 
          ? window.location.origin 
          : 'http://localhost:3000';
        
        // Resend all polls to keep them alive on server
        // Note: Server won't overwrite existing polls with votes
        for (const poll of polls) {
          await fetch(`${serverUrl}/api/socket`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              roomId,
              type: 'pollHeartbeat',
              poll
            })
          });
        }
        
        console.log('💓 [POLL HEARTBEAT] Re-sent', polls.length, 'poll(s)');
      } catch (error) {
        console.error('❌ [POLL HEARTBEAT] Failed:', error);
      }
    };
    
    // Send heartbeat every 20 seconds
    const interval = setInterval(sendPollsHeartbeat, 20000);
    
    return () => clearInterval(interval);
  }, [roomId, polls]);
  
  // Poll for reactions, hand raises, and chat messages from other participants (every 1 second)
  useEffect(() => {
    if (!roomId) return;
    
    const seenReactionIds = new Set();
    const seenMessageIds = new Set();
    
    const pollReactionsHandsAndChat = async () => {
      try {
        const serverUrl = process.env.NODE_ENV === 'production' 
          ? window.location.origin 
          : 'http://localhost:3000';
        
        // Poll reactions
        const reactionsResponse = await fetch(`${serverUrl}/api/socket?roomId=${roomId}`);
        
        if (reactionsResponse.ok) {
          const data = await reactionsResponse.json();
          
          // Only add reactions we haven't seen before
          if (data.reactions && data.reactions.length > 0) {
            const newReactions = data.reactions.filter(r => !seenReactionIds.has(r.id));
            
            if (newReactions.length > 0) {
              console.log('😀 [POLL] Received new reactions:', newReactions.length);
              
              newReactions.forEach(reaction => {
                seenReactionIds.add(reaction.id);
                
                // Add to state
                setReactions(prev => {
                  // Avoid duplicates
                  if (prev.some(r => r.id === reaction.id)) return prev;
                  return [...prev, reaction];
                });
                
                // Auto-remove after 3 seconds
                setTimeout(() => {
                  setReactions(prev => prev.filter(r => r.id !== reaction.id));
                  seenReactionIds.delete(reaction.id);
                }, 3000);
              });
            }
          }
        }
        
        // Poll hand raises
        const handsResponse = await fetch(`${serverUrl}/api/socket?roomId=${roomId}&type=hands`);
        
        if (handsResponse.ok) {
          const handsData = await handsResponse.json();
          
          if (handsData.handsRaised) {
            const myPeerId = peerRef.current?.id;
            // CRITICAL: Filter out MY peer ID - I have my own isHandRaised state
            // This Set should ONLY contain OTHER participants' peer IDs who raised hands
            const othersWhoRaisedHands = handsData.handsRaised.filter(id => id !== myPeerId);
            const newHandsRaised = new Set(othersWhoRaisedHands);
            setHandsRaised(newHandsRaised);
            
            if (newHandsRaised.size > 0 || (myPeerId && handsData.handsRaised.includes(myPeerId))) {
              console.log('✋ [POLL] Server IDs raised:', handsData.handsRaised);
              console.log('✋ [POLL] My peer ID:', myPeerId);
              console.log('✋ [POLL] Others IDs with hands:', Array.from(newHandsRaised));
              console.log('✋ [POLL] Remote participants:', Array.from(peers.entries()).map(([id, p]) => `${p.userName} (${id})`));
            }
          }
        }
        
        // Poll chat messages
        const chatResponse = await fetch(`${serverUrl}/api/socket?roomId=${roomId}&type=messages`);
        
        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          
          if (chatData.messages && chatData.messages.length > 0) {
            const newMessages = chatData.messages.filter(m => !seenMessageIds.has(m.id));
            
            if (newMessages.length > 0) {
              console.log('💬 [POLL] Received new messages:', newMessages.length);
              
              newMessages.forEach(msg => {
                seenMessageIds.add(msg.id);
                setMessages(prev => {
                  // Avoid duplicates
                  if (prev.some(m => m.id === msg.id)) return prev;
                  return [...prev, msg];
                });
              });
            }
          }
          
          // Poll for polls - merge server and local data
          const pollsResponse = await fetch(`${serverUrl}/api/socket?roomId=${roomId}&type=polls`);
          if (pollsResponse.ok) {
            const pollsData = await pollsResponse.json();
            if (pollsData.polls && Array.isArray(pollsData.polls)) {
              setPolls(prev => {
                // If server has polls, use them as they have latest vote data
                if (pollsData.polls.length > 0) {
                  return pollsData.polls;
                }
                // If server has no polls but we have local polls, keep local polls
                // This handles serverless recycling
                return prev;
              });
            }
          }
        }
      } catch (error) {
        // Silently fail - don't spam console
      }
    };
    
    // Poll every 1 second
    const interval = setInterval(pollReactionsHandsAndChat, 1000);
    
    return () => clearInterval(interval);
  }, [roomId, userName, peers]);

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
      
      // Check WebRTC support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support WebRTC. Please use Chrome, Firefox, Safari, or Edge (latest versions).');
      }
      
      // Check RTCPeerConnection support
      const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
      if (!RTCPeerConnection) {
        throw new Error('Your browser does not support WebRTC peer connections. Please update your browser to the latest version.');
      }
      
      // Check for secure context (HTTPS or localhost)
      if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.warn('⚠️ WebRTC requires HTTPS in production');
        throw new Error('Video calls require a secure connection (HTTPS). Please access this page via HTTPS.');
      }
      
      console.log('✅ WebRTC is supported');
      console.log('🌐 Browser:', navigator.userAgent);
      console.log('🔒 Protocol:', window.location.protocol);
      
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
        // Request maximum quality video and audio (1080p @ 60fps)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 60, max: 60 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: { ideal: 48000 }
          }
        });
      } catch (errBoth) {
        console.warn('⚠️ getUserMedia(video+audio) failed:', errBoth);
        // Try video-only with flexible quality settings
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 1920, max: 1920 },
              height: { ideal: 1080, max: 1080 },
              frameRate: { ideal: 60, max: 60 }
            }, 
            audio: false 
          });
          setError('Microphone access failed. You can join with camera only, or check mic permissions.');
        } catch (errVideo) {
          console.warn('⚠️ getUserMedia(video-only) failed:', errVideo);
          // Try audio-only
          try {
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: false, 
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
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
      
      // Log track settings for debugging quality
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log('📷 Video track settings:', settings);
        console.log('📷 Actual resolution:', settings.width + 'x' + settings.height, '@', settings.frameRate + 'fps');
        console.log('📷 Video track enabled:', videoTrack.enabled);
        // Ensure video track is enabled by default
        videoTrack.enabled = true;
      }
      if (audioTrack) {
        const settings = audioTrack.getSettings();
        console.log('🎤 Audio track settings:', settings);
        console.log('🎤 Sample rate:', settings.sampleRate, 'Hz');
        console.log('🎤 Audio track enabled:', audioTrack.enabled);
        // Ensure audio track is enabled by default
        audioTrack.enabled = true;
      }
      
      // Update state based on available tracks
      setIsCameraOn(videoTrack ? videoTrack.enabled : false);
      setIsMicOn(audioTrack ? audioTrack.enabled : false);
      
      setLocalStream(stream);
      console.log('🎥 Local stream state updated, useEffect will attach to video element');

      // Socket.IO DISABLED - Using HTTP polling instead (Vercel serverless limitation)
      console.log('ℹ️ Socket.IO disabled - using HTTP API for reactions');
      /*
      // Initialize socket connection - ALWAYS connect for real-time features
      const isProductionEnv = process.env.NODE_ENV === 'production';
      const serverUrl = isProductionEnv 
        ? window.location.origin  // Use same origin in production (Vercel handles routing)
        : (process.env.REACT_APP_SERVER_URL || 'http://localhost:3002');
      
      console.log('🔌 Initializing Socket.IO connection...');
      console.log('🔌 Environment:', isProductionEnv ? 'Production' : 'Development');
      console.log('🔌 Server URL:', serverUrl);
        
      const socketOptions = {
        path: isProductionEnv ? '/api/socket' : '/socket.io',
        transports: ['polling', 'websocket'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      };
      
      console.log('🔌 Connecting to Socket.IO server with options:', socketOptions);
      socketRef.current = io(serverUrl, socketOptions);
      
      // Socket connection events
      socketRef.current.on('connect', () => {
        console.log('✅ [SOCKET] Connected successfully!');
        console.log('✅ [SOCKET] Socket ID:', socketRef.current.id);
        console.log('✅ [SOCKET] Transport:', socketRef.current.io.engine.transport.name);
      });
      
      socketRef.current.on('connect_error', (error) => {
        console.error('❌ [SOCKET] Connection error:', error.message);
        console.error('❌ [SOCKET] Error details:', error);
      });
      
      socketRef.current.on('disconnect', (reason) => {
        console.warn('⚠️ [SOCKET] Disconnected. Reason:', reason);
      });
      
      socketRef.current.on('reconnect', (attemptNumber) => {
        console.log('🔄 [SOCKET] Reconnected after', attemptNumber, 'attempts');
      });
      */
      
      // Initialize PeerJS (production/development aware)
      const isProduction = process.env.NODE_ENV === 'production';
      
      // Detailed WebRTC availability check
      console.log('🔍 Checking WebRTC support...');
      console.log('  - RTCPeerConnection:', typeof window.RTCPeerConnection);
      console.log('  - webkitRTCPeerConnection:', typeof window.webkitRTCPeerConnection);
      console.log('  - mozRTCPeerConnection:', typeof window.mozRTCPeerConnection);
      console.log('  - getUserMedia:', typeof navigator.mediaDevices?.getUserMedia);
      console.log('  - Browser:', navigator.userAgent);
      console.log('  - Protocol:', window.location.protocol);
      console.log('  - isSecureContext:', window.isSecureContext);
      
      if (!window.RTCPeerConnection && !window.webkitRTCPeerConnection && !window.mozRTCPeerConnection) {
        throw new Error(
          'WebRTC is not available in this browser.\n\n' +
          'Please use one of these browsers (latest version):\n' +
          '• Google Chrome\n' +
          '• Microsoft Edge\n' +
          '• Mozilla Firefox\n' +
          '• Safari\n\n' +
          'Current browser: ' + navigator.userAgent.substring(0, 100)
        );
      }
      
      console.log('🔗 Creating PeerJS connection...');
      console.log('🌍 Environment:', isProduction ? 'Production' : 'Development');
      console.log('🖥️ PeerJS server:', isProduction ? '0.peerjs.com:443 (secure)' : 'localhost:3003');
      
      let peer;
      try {
        peer = new Peer({
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
        console.log('✅ PeerJS instance created successfully');
      } catch (peerCreateError) {
        console.error('❌ Failed to create PeerJS instance:', peerCreateError);
        throw new Error(
          'Failed to initialize video connection.\n\n' +
          'This could be due to:\n' +
          '• Browser extensions blocking WebRTC\n' +
          '• VPN or firewall blocking peer connections\n' +
          '• Browser privacy settings blocking WebRTC\n\n' +
          'Error: ' + peerCreateError.message
        );
      }
      
      peerRef.current = peer;

      peer.on('open', (peerId) => {
        console.log('✅ PeerJS connected with ID:', peerId);
        
        // Try to join via Socket.IO if available
        if (socketRef.current && socketRef.current.connected) {
          console.log('🔌 Joining meeting via Socket.IO');
          socketRef.current.emit('join-meeting', roomId, peerId, userName, userEmail);
        } else {
          console.warn('⚠️ Socket.IO not available, using API-based peer discovery');
          
          // Register this peer and get list of existing peers via API
          const registerPeer = async () => {
            try {
              const response = await fetch(`/api/peer-discovery?meetingId=${roomId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: peerId, userName, userEmail })
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
                  
                  console.log('📞 Calling existing peer via API:', peerData.userName, 'peerId:', peerData.userId);
                  setTimeout(() => {
                    try {
                      const call = peer.call(peerData.userId, stream, {
                        metadata: { userName, userEmail },
                        sdpTransform: (sdp) => {
                          // Increase bandwidth for 1080p60
                          return sdp.replace(/b=AS:(\d+)/g, 'b=AS:5000')
                                    .replace(/b=TIAS:(\d+)/g, 'b=TIAS:5000000');
                        }
                      });
                      
                      if (call) {
                        activeCallsRef.current.set(peerData.userId, call);
                        console.log('✅ Call initiated to:', peerData.userName);
                        
                        call.on('stream', (remoteStream) => {
                          console.log('📹 Received stream from:', peerData.userName);
                          console.log('📹 Stream tracks:', {
                            video: remoteStream.getVideoTracks().length,
                            audio: remoteStream.getAudioTracks().length
                          });
                          addPeer(peerData.userId, remoteStream, peerData.userName);
                        });
                        
                        call.on('close', () => {
                          console.log('📞 Call closed:', peerData.userName);
                          activeCallsRef.current.delete(peerData.userId);
                          removePeer(peerData.userId);
                        });
                        
                        call.on('error', (err) => {
                          console.error('❌ Call error with', peerData.userName, ':', err);
                          activeCallsRef.current.delete(peerData.userId);
                          // Don't remove peer immediately, they might reconnect
                        });
                      } else {
                        console.error('❌ Failed to create call to:', peerData.userName);
                      }
                    } catch (callError) {
                      console.error('❌ Exception calling peer:', peerData.userName, callError);
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
                // Filter out ourselves and peers we're already connected to
                const newPeers = result.peers.filter(p => 
                  p.userId !== peerId && !activeCallsRef.current.has(p.userId)
                );
                
                newPeers.forEach(peerData => {
                  console.log('📞 New peer detected via polling:', peerData.userName);
                  const call = peer.call(peerData.userId, stream, {
                    metadata: { userName, userEmail },
                    sdpTransform: (sdp) => {
                      // Increase bandwidth for 1080p60
                      return sdp.replace(/b=AS:(\d+)/g, 'b=AS:5000')
                                .replace(/b=TIAS:(\d+)/g, 'b=TIAS:5000000');
                    }
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
          
          // Heartbeat to keep this peer alive in the API (every 10 seconds)
          const heartbeatInterval = setInterval(async () => {
            try {
              await fetch(`/api/peer-discovery?meetingId=${roomId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: peerId, userName, userEmail })
              });
            } catch (error) {
              console.error('❌ Heartbeat error:', error);
            }
          }, 10000);
          
          // Store interval IDs for cleanup
          window.peerPollInterval = pollInterval;
          window.peerHeartbeatInterval = heartbeatInterval;
        }
      });

      // Handle PeerJS errors
      peer.on('error', (err) => {
        console.error('❌ PeerJS error:', err);
        console.error('❌ Error type:', err.type);
        console.error('❌ Error message:', err.message);
        
        if (err.type === 'browser-incompatible' || err.message?.includes('WebRTC')) {
          setError(
            `Your browser does not support video calls. Please use:\n` +
            `• Google Chrome (latest version)\n` +
            `• Mozilla Firefox (latest version)\n` +
            `• Microsoft Edge (latest version)\n` +
            `• Safari (latest version)\n\n` +
            `Current browser: ${navigator.userAgent}`
          );
        } else if (err.type === 'network' || err.type === 'server-error') {
          setError('Unable to connect to video server. Please check your internet connection and try again.');
        } else if (err.type === 'peer-unavailable') {
          console.warn('⚠️ Peer unavailable, they may have disconnected');
        } else if (err.type === 'ssl-unavailable') {
          setError('Secure connection (HTTPS) is required for video calls. Please ensure you are accessing this page via HTTPS.');
        } else {
          setError(`Connection error: ${err.message}. Please refresh the page and try again.`);
        }
      });

      // Handle incoming calls
      peer.on('call', (call) => {
        console.log('📞 Incoming call from:', call.peer, 'metadata:', call.metadata);
        
        if (!stream) {
          console.error('❌ Cannot answer call - no local stream available');
          return;
        }
        
        call.answer(stream);
        activeCallsRef.current.set(call.peer, call);
        console.log('✅ Answered call from:', call.metadata?.userName || call.peer);
        
        call.on('stream', (remoteStream) => {
          console.log('📹 Received stream from incoming call:', call.peer);
          console.log('📹 Stream tracks:', {
            video: remoteStream.getVideoTracks().length,
            audio: remoteStream.getAudioTracks().length
          });
          
          // Log video track details
          const videoTrack = remoteStream.getVideoTracks()[0];
          if (videoTrack) {
            console.log('📹 Video track enabled:', videoTrack.enabled, 'readyState:', videoTrack.readyState);
          }
          
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

      /* Socket.IO event listeners DISABLED - using HTTP polling
      // Socket event listeners (only if Socket.IO is available)
      if (socketRef.current) {
        socketRef.current.on('user-joined', ({ userId, userName: joinedUserName, socketId }) => {
          console.log('👤 User joined:', joinedUserName, 'with userId:', userId);
          // Call the new user
          const call = peer.call(userId, stream, {
            metadata: { userName },
            sdpTransform: (sdp) => {
              // Increase bandwidth for 1080p60
              return sdp.replace(/b=AS:(\d+)/g, 'b=AS:5000')
                        .replace(/b=TIAS:(\d+)/g, 'b=TIAS:5000000');
            }
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
              metadata: { userName },
              sdpTransform: (sdp) => {
                // Increase bandwidth for 1080p60
                return sdp.replace(/b=AS:(\d+)/g, 'b=AS:5000')
                          .replace(/b=TIAS:(\d+)/g, 'b=TIAS:5000000');
              }
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

        /* Poll event listeners - DISABLED
        socketRef.current.on('poll-created', (pollData) => {
          console.log(`📊 New poll received: ${pollData.poll.question}`);
          const pollWithDate = {
            ...pollData.poll,
            createdAt: new Date(pollData.poll.createdAt)
          };
          setPolls(prev => [...prev, pollWithDate]);
        });

        socketRef.current.on('poll-vote', (pollData) => {
          console.log(`🗳️ Poll vote received for: ${pollData.poll.question}`);
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
          console.log(`✋ ${handUserName} ${isRaised ? 'raised' : 'lowered'} hand`);
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
          console.log('😀 [REACTION RECEIVED] Full data:', { reaction });
          console.log('😀 [REACTION RECEIVED] Emoji:', reaction.emoji);
          console.log('😀 [REACTION RECEIVED] From:', reaction.userName);
          console.log('😀 [REACTION RECEIVED] Current reactions count:', reactions.length);
          
          setReactions(prev => {
            const newReactions = [...prev, reaction];
            console.log('😀 [REACTION RECEIVED] Updated reactions count:', newReactions.length);
            return newReactions;
          });
          
          setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== reaction.id));
            console.log('😀 [REACTION RECEIVED] Removed reaction after 3s:', reaction.id);
          }, 3000);
        });
      }
      */

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
    console.log('➕ Adding peer:', userName, 'userId:', userId);
    console.log('➕ Stream details:', {
      active: stream.active,
      id: stream.id,
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length
    });
    
    setPeers(prevPeers => {
      const newPeers = new Map(prevPeers);
      newPeers.set(userId, { stream, userName });
      console.log('➕ Peers count:', newPeers.size);
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

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const message = {
      id: Date.now() + Math.random(), // Unique ID
      userName,
      message: newMessage.trim(),
      timestamp: Date.now(),
      replyTo: replyTo ? {
        id: replyTo.id,
        userName: replyTo.userName,
        message: replyTo.message
      } : null
    };
    
    // Add to local state immediately
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setReplyTo(null);
    
    // Send to server via HTTP API
    try {
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3000';
      
      await fetch(`${serverUrl}/api/socket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          roomId, 
          message
        })
      });
      
      console.log('💬 [CHAT] Message sent successfully');
    } catch (error) {
      console.error('❌ [CHAT] Failed to send:', error);
    }
  };

  // Poll functions
  const createPoll = async () => {
    if (!newPoll.question.trim() || !newPoll.options.every(opt => opt.trim())) {
      return;
    }
    
    const poll = {
      id: Date.now() + Math.random(),
      question: newPoll.question.trim(),
      options: newPoll.options.filter(opt => opt.trim()).map((option, index) => ({
        id: index,
        text: option.trim(),
        votes: 0,
        voters: [] // Array of userNames who voted for this option
      })),
      createdBy: userName,
      timestamp: Date.now()
    };
    
    // Add to local state immediately
    setPolls(prev => [...prev, poll]);
    setNewPoll({ question: '', options: ['', ''] });
    setShowCreatePoll(false);
    
    // Send to server via HTTP API
    try {
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3000';
      
      await fetch(`${serverUrl}/api/socket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          roomId,
          type: 'poll',
          poll
        })
      });
      
      console.log('📊 [POLL] Poll created successfully');
    } catch (error) {
      console.error('❌ [POLL] Failed to create:', error);
    }
  };

  const votePoll = async (pollId, optionId) => {
    const previousVote = pollVotes[pollId];
    
    // Update local vote tracking immediately for UI feedback
    setPollVotes(prev => ({ ...prev, [pollId]: optionId }));
    
    // Send vote to server (no optimistic update - rely on server polling)
    try {
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3000';
      
      await fetch(`${serverUrl}/api/socket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          roomId,
          type: 'pollVote',
          pollId,
          optionId,
          previousVote,
          userName
        })
      });
      
      console.log('📊 [POLL] Vote submitted successfully');
    } catch (error) {
      console.error('❌ [POLL] Failed to vote:', error);
      // Revert vote tracking on error
      setPollVotes(prev => {
        const updated = { ...prev };
        if (previousVote !== undefined) {
          updated[pollId] = previousVote;
        } else {
          delete updated[pollId];
        }
        return updated;
      });
    }
  };

  const addPollOption = () => {
    if (newPoll.options.length < 10) {
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
  const toggleRaiseHand = async () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    
    if (!peerRef.current?.id) {
      console.error('❌ [HAND] No peer ID available yet');
      return;
    }
    
    const myPeerId = peerRef.current.id;
    console.log('✋ [TOGGLE] My ID:', myPeerId, 'Name:', userName, 'New state:', newState);
    
    // Send to server via HTTP API using peer ID
    try {
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3000';
      
      const response = await fetch(`${serverUrl}/api/socket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          roomId, 
          handRaise: { 
            peerId: myPeerId, 
            userName: userName, // For display purposes only
            isRaised: newState 
          }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✋ [HAND] ${newState ? 'Raised' : 'Lowered'} hand successfully`);
        console.log('✋ [HAND] Server confirmed IDs:', result.handsRaised);
      } else {
        console.error('❌ [HAND] Server error:', await response.text());
      }
    } catch (error) {
      console.error('❌ [HAND] Failed to send:', error);
    }
  };

  // Reaction functions
  const sendReaction = async (emoji) => {
    console.log('😀 [REACTION] User clicked emoji:', emoji);
    
    const reaction = {
      id: Date.now(),
      emoji,
      userName,
      timestamp: Date.now()
    };
    
    // Add reaction locally first
    setReactions(prev => {
      console.log('😀 [REACTION] Adding to local state. Current reactions:', prev.length);
      return [...prev, reaction];
    });
    
    // Send to server via HTTP API
    try {
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3000';
      
      console.log('😀 [REACTION] Sending to server:', serverUrl);
      
      const response = await fetch(`${serverUrl}/api/socket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId, reaction })
      });
      
      if (response.ok) {
        console.log('😀 [REACTION] Sent successfully to server');
      } else {
        console.error('❌ [REACTION] Server error:', await response.text());
      }
    } catch (error) {
      console.error('❌ [REACTION] Failed to send:', error);
    }
    
    // Remove reaction after 3 seconds
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reaction.id));
      console.log('😀 [REACTION] Removed reaction:', reaction.id);
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
    
    // Clean up heartbeat interval
    if (window.peerHeartbeatInterval) {
      clearInterval(window.peerHeartbeatInterval);
    }
    
    // Clean up peer data from API
    if (roomId && peerRef.current && peerRef.current.id) {
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

  // Show validating state
  if (isValidating) {
    return (
      <LoadingScreen
        onComplete={() => {}}
        message="Validating meeting access..."
      />
    );
  }

  // Show access denied screen
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center bg-red-600/20 border border-red-600 rounded-lg p-8 max-w-md w-full">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-3">Access Denied</h3>
          <p className="text-red-200 mb-6 leading-relaxed">{accessDeniedReason}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

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
        <div className="text-center bg-red-600/20 border border-red-600 rounded-lg p-8 max-w-2xl w-full">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-white text-lg font-semibold mb-2">Unable to Join Meeting</h3>
          <p className="text-red-200 mb-6 leading-relaxed whitespace-pre-line text-left">{error}</p>
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
    <div className="h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white flex flex-col overflow-hidden">
      
      {/* Premium Glassmorphism Header */}
      <div className="bg-black/40 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3 shadow-2xl relative overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5"></div>
        
        <div className="flex items-center justify-between relative max-w-screen-2xl mx-auto z-10">
          {/* Left Section - Timer and Clock */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Meeting Duration with Pulse */}
            <div className="flex items-center gap-2 bg-gradient-to-br from-blue-600/20 to-blue-700/20 backdrop-blur-sm px-3 py-2 rounded-xl border border-blue-500/30 shadow-lg hover:shadow-blue-500/20 transition-all duration-300 hover:scale-105">
              <div className="relative">
                <Timer className="w-4 h-4 text-blue-400" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <span className="text-sm font-semibold text-white font-mono tracking-wider">{meetingDuration}</span>
            </div>
            {/* Current Time */}
            <div className="hidden md:flex items-center gap-2 bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 backdrop-blur-sm px-3 py-2 rounded-xl border border-emerald-500/30 shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 hover:scale-105">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white font-mono tracking-wider">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          
          {/* Center Section - Meeting Name with Live Indicator */}
          <div className="absolute left-1/2 transform -translate-x-1/2 hidden lg:flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <div className="absolute w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
              </div>
              <span className="text-sm font-bold text-white tracking-wide">{meetingTitle || 'Meeting Room'}</span>
            </div>
          </div>
        
          {/* Right Section - Premium Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="group flex items-center space-x-2 px-3 sm:px-4 py-2.5 bg-gradient-to-br from-purple-600/20 to-purple-700/20 hover:from-purple-600/30 hover:to-purple-700/30 backdrop-blur-sm rounded-xl transition-all duration-300 border border-purple-500/30 hover:border-purple-500/50 shadow-lg hover:shadow-purple-500/20 hover:scale-105"
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300 group-hover:text-purple-200 transition-colors" />
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold text-white">{participants.length + 1}</span>
                <span className="hidden sm:inline text-xs text-purple-200/80">participants</span>
              </div>
            </button>
          
            <button
              onClick={() => setShowChat(!showChat)}
              className={`group relative flex items-center space-x-2 px-3 sm:px-4 py-2.5 rounded-xl transition-all duration-300 border shadow-lg hover:scale-105 ${
                showChat 
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500/50 text-white shadow-blue-500/30' 
                  : 'bg-gradient-to-br from-gray-700/40 to-gray-800/40 hover:from-gray-700/60 hover:to-gray-800/60 backdrop-blur-sm border-white/10 hover:border-white/20'
              }`}
            >
              <MessageSquare className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${showChat ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} />
              <span className="text-sm font-semibold hidden sm:inline">Chat</span>
              {messages.length > 0 && !showChat && (
                <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-red-500 to-red-600 text-xs rounded-full w-5 h-5 flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/50 animate-bounce">
                  {messages.length > 9 ? '9+' : messages.length}
                </span>
              )}
            </button>
          
            <button
              onClick={toggleRaiseHand}
              className={`group flex items-center space-x-2 px-3 sm:px-4 py-2.5 rounded-xl transition-all duration-300 border shadow-lg hover:scale-105 ${
                isHandRaised 
                  ? 'bg-gradient-to-br from-yellow-500 to-orange-500 border-yellow-400/50 text-white shadow-yellow-500/30 animate-pulse' 
                  : 'bg-gradient-to-br from-gray-700/40 to-gray-800/40 hover:from-gray-700/60 hover:to-gray-800/60 backdrop-blur-sm border-white/10 hover:border-white/20'
              }`}
              title="Raise hand"
            >
              <Hand className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${isHandRaised ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} />
              <span className="text-sm font-semibold hidden sm:inline">
                {isHandRaised ? 'Lower' : 'Raise'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Premium Video Grid with Subtle Pattern */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 relative">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(255 255 255) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
        
        {/* Video Grid Container - Responsive & Centered */}
        <div className={`${containerClass} h-full flex items-center justify-center`}>
          {hasPinned ? (
            <>
              {/* Pinned Video - Large (70% of screen) */}
              {pinnedParticipant === 'local' ? (
                <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-blue-500/50 group transition-all duration-200 w-full max-w-6xl aspect-video mx-auto">
                  <video
                    ref={localVideoCallbackRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover bg-black transition-opacity duration-300 ${!isCameraOn || !localStream ? 'opacity-0' : 'opacity-100'}`}
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  {(!isCameraOn || !localStream) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
                      {userProfilePic ? (
                        <img src={decodeURIComponent(userProfilePic)} alt={userName} className="w-32 h-32 rounded-full object-cover shadow-lg" />
                      ) : (
                        <div className={`w-32 h-32 rounded-full ${getAvatarColor(userName)} flex items-center justify-center shadow-lg`}>
                          <span className="text-5xl font-semibold text-white">{getUserInitials(userName)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {!localStream && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <VideoIcon className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-white/70 text-sm font-medium">Connecting...</div>
                      </div>
                    </div>
                  )}
                  {isHandRaised && (
                    <div className="absolute top-3 left-3 bg-gradient-to-br from-yellow-400 to-orange-500 p-2 rounded-full">
                      <Hand className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-md">
                    <span className="text-sm font-medium text-white">{userName} (Pinned)</span>
                  </div>
                  <button
                    onClick={() => setPinnedParticipant(null)}
                    className="absolute top-3 right-3 bg-blue-600 hover:bg-blue-700 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Unpin"
                  >
                    <PinOff className="w-4 h-4 text-white" />
                  </button>
                  <div className="absolute top-3 right-16 flex gap-1">
                    {!isMicOn && (
                      <div className="bg-red-600 p-1.5 rounded-full">
                        <MicOff className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {!isCameraOn && (
                      <div className="bg-red-600 p-1.5 rounded-full">
                        <VideoOff className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                getSortedParticipants().map(([peerId, peerData]) => {
                  if (peerId === pinnedParticipant) {
                    return (
                      <RemoteVideo
                        key={peerId}
                        peerId={peerId}
                        stream={peerData.stream}
                        userName={peerData.userName}
                        handsRaised={handsRaised}
                        isPinned={true}
                        isThumbnail={false}
                        onPin={() => setPinnedParticipant(null)}
                        pinnedClass={pinnedClass}
                      />
                    );
                  }
                  return null;
                }).filter(Boolean)
              )}
              
              {/* Thumbnail Grid */}
              <div className={gridClass}>
                {pinnedParticipant !== 'local' && (
                  <div className={`relative bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-700/30 group hover:border-gray-600/50 transition-all duration-200 ${gridVideoClass}`}>
                    <video
                      ref={localVideoCallbackRef}
                      autoPlay
                      muted
                      playsInline
                      className={`w-full h-full object-cover bg-black transition-opacity duration-300 ${!isCameraOn || !localStream ? 'opacity-0' : 'opacity-100'}`}
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    {(!isCameraOn || !localStream) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
                        {userProfilePic ? (
                          <img src={decodeURIComponent(userProfilePic)} alt={userName} className="w-10 h-10 rounded-full object-cover shadow-lg" />
                        ) : (
                          <div className={`w-10 h-10 rounded-full ${getAvatarColor(userName)} flex items-center justify-center shadow-lg`}>
                            <span className="text-base font-semibold text-white">{getUserInitials(userName)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {!localStream && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <VideoIcon className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-md">
                      <span className="text-xs font-medium text-white">{userName}</span>
                    </div>
                    <button
                      onClick={() => setPinnedParticipant('local')}
                      className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-blue-500 backdrop-blur-sm p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Pin"
                    >
                      <Pin className="w-3 h-3 text-white" />
                    </button>
                    {!isMicOn && (
                      <div className="absolute top-1.5 left-1.5 bg-red-600 p-1 rounded-full">
                        <MicOff className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                )}
                {getSortedParticipants().map(([peerId, peerData]) => {
                  if (peerId === pinnedParticipant) return null;
                  return (
                    <RemoteVideo
                      key={peerId}
                      peerId={peerId}
                      stream={peerData.stream}
                      userName={peerData.userName}
                      handsRaised={handsRaised}
                      isPinned={false}
                      isThumbnail={true}
                      onPin={() => setPinnedParticipant(peerId)}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <div className={gridClass}>
              {/* Local Video */}
              <div className={`relative bg-gray-900 rounded-2xl overflow-hidden shadow-xl border-2 border-gray-700/40 group hover:border-gray-600/60 transition-all duration-300 ease-in-out ${singleVideoClass || ''} ${totalParticipants === 2 ? 'w-[48%] aspect-[4/3]' : totalParticipants === 3 ? 'w-[30%] aspect-[4/3]' : totalParticipants === 4 ? 'w-[48%] aspect-[4/3]' : totalParticipants <= 6 ? 'w-[31%] aspect-[4/3]' : 'aspect-video'}`}>
                <video
                  ref={localVideoCallbackRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover bg-black transition-opacity duration-300 ${!isCameraOn || !localStream ? 'opacity-0' : 'opacity-100'}`}
                  style={{ transform: 'scaleX(-1)' }}
                />
              {(!isCameraOn || !localStream) && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
                  <div className="text-center">
                    {userProfilePic ? (
                      <img src={decodeURIComponent(userProfilePic)} alt={userName} className="w-20 h-20 mx-auto rounded-full object-cover shadow-lg" />
                    ) : (
                      <div className={`w-20 h-20 mx-auto rounded-full ${getAvatarColor(userName)} flex items-center justify-center shadow-lg`}>
                        <span className="text-2xl font-semibold text-white">{getUserInitials(userName)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!localStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <VideoIcon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-white/70 text-sm font-medium">Connecting...</div>
                  </div>
                </div>
              )}
              
              {/* Premium Gradient Overlay on Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              
              {/* Hand Raised Indicator */}
              {isHandRaised && (
                <div className="absolute top-2 md:top-3 left-2 md:left-3 bg-gradient-to-br from-yellow-400 to-orange-500 backdrop-blur-sm p-1.5 md:p-2 rounded-lg shadow-lg shadow-yellow-500/50 animate-pulse">
                  <Hand className="w-3.5 h-3.5 md:w-4 md:h-4 text-white animate-bounce" />
                </div>
              )}

              {/* User Info - Clean Badge */}
              <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-md">
                <span className="text-sm font-medium text-white truncate max-w-[120px]">{userName}</span>
              </div>
              
              {/* Status Indicators - Top Right */}
              <div className="absolute top-3 right-3 flex gap-1">
                {/* Pin Button */}
                <button
                  onClick={() => setPinnedParticipant('local')}
                  className="bg-black/60 hover:bg-blue-500 backdrop-blur-sm p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                  title="Pin your video"
                >
                  <Pin className="w-4 h-4 text-white" />
                </button>
                {!isMicOn && (
                  <div className="bg-red-600 p-1.5 rounded-full">
                    <MicOff className="w-4 h-4 text-white" />
                  </div>
                )}
                {!isCameraOn && (
                  <div className="bg-red-600 p-1.5 rounded-full">
                    <VideoOff className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </div>

              {/* Remote Videos */}
              {getSortedParticipants().map(([peerId, peerData]) => (
                <RemoteVideo 
                  key={peerId}
                  peerId={peerId}
                  stream={peerData.stream} 
                  userName={peerData.userName} 
                  handsRaised={handsRaised}
                  isPinned={false}
                  isThumbnail={false}
                  onPin={() => setPinnedParticipant(peerId)}
                />
              ))}
            </div>
          )}
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
          <div className="fixed lg:relative bottom-0 lg:bottom-0 left-0 right-0 lg:w-96 bg-gray-900/95 backdrop-blur-sm border-l lg:border-l border-t lg:border-t-0 border-white/10 flex flex-col h-[calc(100vh-80px)] lg:h-[calc(100vh-60px)] z-40">
            {/* Header with Close Button for Mobile */}
            <div className="lg:hidden flex items-center justify-between p-2.5 border-b border-white/10 flex-shrink-0 bg-gray-900">
              <h3 className="font-semibold text-white text-sm">Meeting Chat</h3>
              <button 
                onClick={() => setShowChat(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-white/10 flex-shrink-0 bg-gray-900">
              <div className="flex">
                {[
                  { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" />, badge: messages.length },
                  { id: 'polls', label: 'Polls', icon: <BarChart3 className="w-4 h-4" />, badge: polls.length },
                  { id: 'notepad', label: 'Notes', icon: <FileText className="w-4 h-4" /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-1 lg:p-4 transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-blue-500/20 border-b-2 border-blue-500 text-blue-300'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.icon}
                    <span className="text-xs lg:text-sm font-medium">{tab.label}</span>
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
            <div className="flex-1 flex flex-col min-h-0 bg-gray-900 overflow-hidden">
              
              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <div className="flex flex-col h-full">
                  {/* Header - Desktop only */}
                  <div className="hidden lg:block p-4 border-b border-white/10 flex-shrink-0">
                    <h3 className="font-semibold text-white text-base">Meeting Chat</h3>
                    <p className="text-sm text-gray-300 mt-1">{participants.length + 1} participants</p>
                  </div>
                  
                  {/* Messages area - Scrollable */}
                  <div className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-2 lg:space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {messages.length === 0 ? (
                      <div className="text-center py-4 text-gray-400">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No messages yet</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className="group bg-white/10 backdrop-blur-sm rounded-lg p-2 lg:p-4 border border-white/10 hover:bg-white/15 transition-all relative">
                          {/* Reply indicator */}
                          {message.replyTo && (
                            <div className="mb-2 pb-2 border-l-2 border-blue-500 pl-2 bg-white/5 rounded p-1.5">
                              <div className="text-xs text-blue-300 font-semibold">{message.replyTo.userName}</div>
                              <div className="text-xs text-gray-400 truncate">{message.replyTo.message}</div>
                            </div>
                          )}
                          
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-xs lg:text-sm text-blue-300 mb-1">{message.userName}</div>
                              <div className="text-xs lg:text-sm text-white leading-relaxed break-words">{message.message}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            
                            {/* Reply button */}
                            <button
                              onClick={() => setReplyTo(message)}
                              className="opacity-0 group-hover:opacity-100 ml-2 p-1.5 rounded hover:bg-white/10 transition-all flex-shrink-0"
                              title="Reply"
                            >
                              <Reply className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-400 hover:text-blue-400" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Input area - Fixed at bottom */}
                  <div className="p-2 lg:p-4 border-t border-white/10 bg-gray-900 flex-shrink-0">
                    {/* Reply preview */}
                    {replyTo && (
                      <div className="mb-2 flex items-start justify-between bg-blue-500/10 border-l-2 border-blue-500 p-2 rounded">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-blue-300 font-semibold">Replying to {replyTo.userName}</div>
                          <div className="text-xs text-gray-400 truncate">{replyTo.message}</div>
                        </div>
                        <button
                          onClick={() => setReplyTo(null)}
                          className="ml-2 p-1 hover:bg-white/10 rounded flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder={replyTo ? `Reply to ${replyTo.userName}...` : "Type message..."}
                        className="flex-1 bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 px-2.5 py-2.5 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-sm"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2.5 rounded-lg transition-all duration-300 flex-shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
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
                      polls.map((poll) => {
                        const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.voters ? opt.voters.length : opt.votes || 0), 0);
                        
                        return (
                          <div key={poll.id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                            <h4 className="font-medium text-white mb-3 text-sm lg:text-base">{poll.question}</h4>
                            <div className="space-y-2">
                              {poll.options.map((option) => {
                                const voteCount = option.voters ? option.voters.length : (option.votes || 0);
                                const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                                const hasVoted = pollVotes[poll.id] === option.id;
                                
                                return (
                                  <button
                                    key={option.id}
                                    onClick={() => votePoll(poll.id, option.id)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all duration-300 ${
                                      hasVoted
                                        ? 'bg-blue-500/30 border-blue-500/50 text-blue-200'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300 cursor-pointer'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs lg:text-sm font-medium">{option.text}</span>
                                      <span className="text-xs font-semibold">{percentage.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full transition-all duration-500 ${
                                          hasVoted ? 'bg-blue-500' : 'bg-gray-500'
                                        }`}
                                        style={{ width: `${percentage}%` }}
                                      ></div>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                      {voteCount} vote{voteCount !== 1 ? 's' : ''}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                              <div className="text-xs text-gray-400">
                                By {poll.createdBy}
                              </div>
                              <div className="text-xs text-gray-400">
                                {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })
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

    {/* Premium Floating Control Bar - Modern & Responsive */}
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-black/70 backdrop-blur-2xl border border-white/20 rounded-3xl p-3 sm:p-4 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-center space-x-3 sm:space-x-4">
          <button
            onClick={toggleMic}
            className={`group relative p-4 rounded-2xl transition-all duration-300 transform active:scale-90 hover:scale-110 shadow-lg ${
              isMicOn 
                ? 'bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600/70 hover:to-slate-700/70 border border-white/20' 
                : 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-500/50 shadow-red-500/50'
            }`}
            title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isMicOn ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
            <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none hidden sm:block">
              <div className="bg-black/95 text-white text-sm px-4 py-2 rounded-xl whitespace-nowrap shadow-xl border border-white/10">
                {isMicOn ? 'Mute' : 'Unmute'}
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-black/95 rotate-45 border-r border-b border-white/10"></div>
            </div>
          </button>
          
          <button
            onClick={toggleCamera}
            className={`group relative p-4 rounded-2xl transition-all duration-300 transform active:scale-90 hover:scale-110 shadow-lg ${
              isCameraOn 
                ? 'bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600/70 hover:to-slate-700/70 border border-white/20' 
                : 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-500/50 shadow-red-500/50'
            }`}
            title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isCameraOn ? <VideoIcon className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
            <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none hidden sm:block">
              <div className="bg-black/95 text-white text-sm px-4 py-2 rounded-xl whitespace-nowrap shadow-xl border border-white/10">
                {isCameraOn ? 'Stop video' : 'Start video'}
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-black/95 rotate-45 border-r border-b border-white/10"></div>
            </div>
          </button>
          
          <button
            onClick={toggleScreenShare}
            className={`group relative p-4 rounded-2xl transition-all duration-300 transform active:scale-90 hover:scale-110 shadow-lg ${
              isScreenSharing 
                ? 'bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 border border-green-500/50 shadow-green-500/50' 
                : 'bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600/70 hover:to-slate-700/70 border border-white/20'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? <MonitorOff className="w-6 h-6 text-white" /> : <Monitor className="w-6 h-6 text-white" />}
            <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none hidden sm:block">
              <div className="bg-black/95 text-white text-sm px-4 py-2 rounded-xl whitespace-nowrap shadow-xl border border-white/10">
                {isScreenSharing ? 'Stop sharing' : 'Share screen'}
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-black/95 rotate-45 border-r border-b border-white/10"></div>
            </div>
          </button>
          
          {/* Reactions Button */}
          <div className="relative">
            <button
              data-reactions-button="true"
              onClick={(e) => {
                e.stopPropagation();
                console.log('😀 Reactions button clicked, current state:', showReactionsMenu);
                setShowReactionsMenu(!showReactionsMenu);
                console.log('😀 Reactions menu toggled to:', !showReactionsMenu);
              }}
              onMouseDown={(e) => {
                console.log('😀 Reactions button mouse down event');
              }}
              className={`group relative p-4 rounded-2xl transition-all duration-300 transform active:scale-90 hover:scale-110 shadow-lg bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600/70 hover:to-slate-700/70 border border-white/20 ${
                showReactionsMenu ? 'ring-2 ring-yellow-400/50' : ''
              }`}
              title="Reactions"
            >
              <Smile className="w-6 h-6 text-white" />
              <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none hidden sm:block">
                <div className="bg-black/95 text-white text-sm px-4 py-2 rounded-xl whitespace-nowrap shadow-xl border border-white/10">
                  Reactions
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-black/95 rotate-45 border-r border-b border-white/10"></div>
              </div>
            </button>
            
            {/* Premium Reactions Menu */}
            {showReactionsMenu && (
              <div 
                data-reactions-menu="true"
                className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 bg-black/95 backdrop-blur-2xl rounded-2xl p-3 border border-white/20 flex space-x-2 shadow-2xl animate-fade-in"
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
                    className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 transform hover:scale-125 active:scale-110 hover:shadow-lg"
                    title={`React with ${emoji}`}
                  >
                    <span className="text-2xl">{emoji}</span>
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
                e.stopPropagation();
                console.log('⚙️ More Tools button clicked, current state:', showToolsMenu);
                setShowToolsMenu(!showToolsMenu);
                console.log('⚙️ Tools menu toggled to:', !showToolsMenu);
              }}
              onMouseDown={(e) => {
                console.log('⚙️ More Tools button mouse down event');
              }}
              className={`group relative p-4 rounded-2xl transition-all duration-300 transform active:scale-90 hover:scale-110 shadow-lg bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600/70 hover:to-slate-700/70 border border-white/20 ${
                showToolsMenu ? 'ring-2 ring-blue-400/50' : ''
              }`}
              title="More Tools"
            >
              <MoreVertical className="w-6 h-6 text-white" />
              <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none hidden sm:block">
                <div className="bg-black/95 text-white text-sm px-4 py-2 rounded-xl whitespace-nowrap shadow-xl border border-white/10">
                  More Tools
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-black/95 rotate-45 border-r border-b border-white/10"></div>
              </div>
            </button>
            
            {/* Premium Tools Menu */}
            {showToolsMenu && (
              <div 
                data-tools-menu="true"
                className="absolute bottom-full mb-3 right-0 bg-black/95 backdrop-blur-2xl rounded-2xl p-2 border border-white/20 min-w-56 shadow-2xl animate-fade-in"
              >
                <button
                  onClick={() => {
                    console.log('🖊️ Whiteboard clicked, current state:', showWhiteboard);
                    setShowWhiteboard(true);
                    setShowToolsMenu(false);
                    console.log('🖊️ Whiteboard state set to true, new state should be:', true);
                    setTimeout(() => {
                      console.log('🖊️ Whiteboard state after timeout:', showWhiteboard);
                    }, 100);
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/10 group"
                >
                  <div className="p-2 bg-gradient-to-br from-blue-600/20 to-blue-700/20 rounded-lg border border-blue-500/30 group-hover:border-blue-500/50 transition-colors">
                    <Edit3 className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">Whiteboard</span>
                </button>
                
                <button
                  onClick={() => {
                    console.log('🔴 Recording clicked, current state:', isRecording);
                    setIsRecording(!isRecording);
                    setShowToolsMenu(false);
                    console.log('🔴 Recording state toggled to:', !isRecording);
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/10 group ${
                    isRecording ? 'bg-red-500/10' : ''
                  }`}
                >
                  <div className={`p-2 rounded-lg border transition-colors ${
                    isRecording 
                      ? 'bg-gradient-to-br from-red-600/30 to-red-700/30 border-red-500/50 animate-pulse' 
                      : 'bg-gradient-to-br from-red-600/20 to-red-700/20 border-red-500/30 group-hover:border-red-500/50'
                  }`}>
                    <Circle className={`w-5 h-5 text-red-400 ${isRecording ? 'fill-current' : ''}`} />
                  </div>
                  <span className="text-sm font-semibold text-white">
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
                    setTimeout(() => {
                      console.log('📝 After timeout - showChat:', showChat, 'activeTab:', activeTab);
                    }, 100);
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/10 group"
                >
                  <div className="p-2 bg-gradient-to-br from-purple-600/20 to-purple-700/20 rounded-lg border border-purple-500/30 group-hover:border-purple-500/50 transition-colors">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">Notepad</span>
                </button>
                
                <button
                  onClick={() => {
                    console.log('📊 Polls clicked');
                    setShowChat(true);
                    setActiveTab('polls');
                    setShowToolsMenu(false);
                    console.log('📊 Chat panel opened with polls tab');
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/10 group"
                >
                  <div className="p-2 bg-gradient-to-br from-orange-600/20 to-orange-700/20 rounded-lg border border-orange-500/30 group-hover:border-orange-500/50 transition-colors">
                    <BarChart3 className="w-5 h-5 text-orange-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">Polls</span>
                </button>
              </div>
            )}
          </div>
          
          <div className="w-px h-10 sm:h-12 bg-gradient-to-b from-transparent via-white/30 to-transparent"></div>
          
          <button
            onClick={leaveMeeting}
            className="group relative p-4 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-2xl transition-all duration-300 transform active:scale-90 hover:scale-110 border border-red-500/50 shadow-lg shadow-red-500/50"
            title="Leave meeting"
          >
            <Phone className="w-6 h-6 text-white transform rotate-[135deg]" />
            <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none hidden sm:block">
              <div className="bg-black/95 text-white text-sm px-4 py-2 rounded-xl whitespace-nowrap shadow-xl border border-white/10">
                Leave meeting
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-black/95 rotate-45 border-r border-b border-white/10"></div>
            </div>
          </button>
        </div>
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

const RemoteVideo = ({ stream, userName, peerId, handsRaised = new Set(), isPinned = false, isThumbnail = false, onPin, pinnedClass = '' }) => {
  const videoRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(true);
  const isHandRaised = handsRaised.has(peerId);
  
  // Helper function to get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // Helper function to get avatar color based on name
  const getAvatarColor = (name) => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-red-500 to-red-600',
      'bg-gradient-to-br from-orange-500 to-orange-600',
      'bg-gradient-to-br from-yellow-500 to-yellow-600',
      'bg-gradient-to-br from-green-500 to-green-600',
      'bg-gradient-to-br from-teal-500 to-teal-600',
      'bg-gradient-to-br from-cyan-500 to-cyan-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      
      // Check if video track exists and is enabled
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        setHasVideo(videoTrack.enabled && videoTrack.readyState === 'live');
        
        // Listen for track enabled/disabled events
        const handleTrackChange = () => {
          setHasVideo(videoTrack.enabled && videoTrack.readyState === 'live');
        };
        
        videoTrack.addEventListener('ended', () => setHasVideo(false));
        videoTrack.addEventListener('mute', () => setHasVideo(false));
        videoTrack.addEventListener('unmute', handleTrackChange);
        
        return () => {
          videoTrack.removeEventListener('ended', () => setHasVideo(false));
          videoTrack.removeEventListener('mute', () => setHasVideo(false));
          videoTrack.removeEventListener('unmute', handleTrackChange);
        };
      } else {
        // No video track means camera is off
        setHasVideo(false);
      }
    }
  }, [stream]);

  if (isThumbnail) {
    // Premium Thumbnail mode in pinned layout
    return (
      <div className="relative bg-gradient-to-br from-gray-900 to-slate-900 rounded-2xl overflow-hidden shadow-xl border border-white/10 group hover:border-blue-500/50 transition-all duration-300 ease-in-out aspect-video hover:shadow-2xl hover:shadow-blue-500/20">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover bg-black transition-opacity duration-300 ${!hasVideo ? 'opacity-0' : 'opacity-100'}`}
          style={{ transform: 'scaleX(-1)' }}
        />        {!hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-gray-900">
            <div className={`w-14 h-14 rounded-full ${getAvatarColor(userName)} flex items-center justify-center shadow-2xl border-2 border-white/20`}>
              <span className="text-xl font-bold text-white">{getUserInitials(userName)}</span>
            </div>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
          <span className="text-xs font-semibold text-white truncate max-w-[calc(100%-3rem)]">{userName}</span>
        </div>
        <button
          onClick={onPin}
          className="absolute top-2 right-2 bg-black/70 hover:bg-gradient-to-br hover:from-blue-600 hover:to-blue-700 backdrop-blur-md p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/10 hover:border-blue-500/50 hover:scale-110 active:scale-95"
          title="Pin"
        >
          <Pin className="w-3.5 h-3.5 text-white" />
        </button>
        {isHandRaised && (
          <div className="absolute top-2 left-2 bg-gradient-to-br from-yellow-400 to-orange-500 p-1.5 rounded-xl animate-pulse shadow-lg border border-yellow-300/50">
            <Hand className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>
    );
  }

  if (isPinned) {
    // Premium Pinned mode - large video view with glassmorphism
    return (
      <div className={`relative bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-blue-500/50 group transition-all duration-300 ease-in-out w-full max-w-6xl aspect-video mx-auto hover:border-blue-400/70 hover:shadow-blue-500/30`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover bg-black transition-opacity duration-300 ${!hasVideo ? 'opacity-0' : 'opacity-100'}`}
          style={{ transform: 'scaleX(-1)' }}
        />
        
        {/* Premium Avatar when camera is off */}
        {!hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
            <div className={`w-40 h-40 rounded-full ${getAvatarColor(userName)} flex items-center justify-center shadow-2xl border-4 border-white/20 backdrop-blur-lg`}>
              <span className="text-6xl font-bold text-white drop-shadow-2xl">{getUserInitials(userName)}</span>
            </div>
          </div>
        )}
        
        {/* Hand Raised Indicator with Premium Glow */}
        {isHandRaised && (
          <div className="absolute top-4 left-4 bg-gradient-to-br from-yellow-400 to-orange-500 p-3 rounded-2xl shadow-xl animate-pulse border-2 border-yellow-300/50">
            <Hand className="w-6 h-6 text-white drop-shadow-lg" />
          </div>
        )}
        
        {/* Premium Name Badge with Glassmorphism */}
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-2xl px-5 py-2.5 rounded-2xl border border-white/20 shadow-xl">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-base font-bold text-white">{userName} <span className="text-blue-400 font-semibold">(Pinned)</span></span>
          </div>
        </div>
        
        {/* Premium Unpin Button - Top Right */}
        <button
          onClick={onPin}
          className="absolute top-4 right-4 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 p-3 rounded-2xl transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-xl border border-blue-500/50 hover:scale-110 active:scale-95"
          title="Unpin"
        >
          <PinOff className="w-5 h-5 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-gray-900 to-slate-900 rounded-2xl overflow-hidden shadow-xl border border-white/10 group hover:border-purple-500/50 transition-all duration-300 ease-in-out aspect-video hover:shadow-2xl hover:shadow-purple-500/20 hover:scale-[1.02]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover bg-black transition-opacity duration-300 ${!hasVideo ? 'opacity-0' : 'opacity-100'}`}
        style={{ transform: 'scaleX(-1)' }}
      />
      
      {/* Premium Avatar when camera is off */}
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-gray-900">
          <div className={`w-24 h-24 rounded-full ${getAvatarColor(userName)} flex items-center justify-center shadow-2xl border-2 border-white/20`}>
            <span className="text-3xl font-bold text-white drop-shadow-lg">{getUserInitials(userName)}</span>
          </div>
        </div>
      )}
      
      {/* Hand Raised Indicator with Pulse */}
      {isHandRaised && (
        <div className="absolute top-3 left-3 bg-gradient-to-br from-yellow-400 to-orange-500 p-2.5 rounded-xl shadow-lg animate-pulse border border-yellow-300/50">
          <Hand className="w-5 h-5 text-white drop-shadow-md" />
        </div>
      )}
      
      {/* Premium Name Badge */}
      <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/20 shadow-lg">
        <span className="text-sm font-bold text-white truncate max-w-[140px]">{userName}</span>
      </div>
      
      {/* Premium Pin Button with Gradient */}
      <button
        onClick={onPin}
        className="absolute top-3 right-3 bg-black/70 hover:bg-gradient-to-br hover:from-purple-600 hover:to-purple-700 backdrop-blur-md p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/10 hover:border-purple-500/50 hover:scale-110 active:scale-95 shadow-lg"
        title="Pin participant"
      >
        <Pin className="w-5 h-5 text-white" />
      </button>
    </div>
  );
};

export default VideoRoom;
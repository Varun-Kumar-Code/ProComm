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
  Subtitles,
  Trash2
} from 'lucide-react';
// import io from 'socket.io-client'; // DISABLED - using HTTP polling
import Peer from 'peerjs';
import LoadingScreen from '../components/LoadingScreen';
import Whiteboard from '../components/Whiteboard';
import PreJoinScreen from '../components/PreJoinScreen';
import CodeSpace from '../components/CodeSpace';
import AttemptHistoryModal from '../components/AttemptHistoryModal';
import { useAuth } from '../context/AuthContext';
import { 
  validateMeetingParticipant, 
  getUserProfile, 
  addParticipantToMeeting,
  sendChatMessage,
  deleteChatMessage,
  subscribeToChatMessages,
  createPollInMeeting,
  deletePollFromMeeting,
  votePollInMeeting,
  subscribeToPolls,
  cleanupMeetingChat,
  addMeetingToHistory,
  checkAssessmentAccess,
  trackAssessmentAttempt,
  updateAttemptStatus
} from '../firebase/firestoreService';
import { db } from '../firebase/config';
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

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
  
  // Proctored assessment states
  const [isProctoredMode, setIsProctoredMode] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [attemptInfo, setAttemptInfo] = useState(null);
  const [showAttemptHistory, setShowAttemptHistory] = useState(false);
  
  // Pre-join states
  const [showPreJoin, setShowPreJoin] = useState(true);
  const [preJoinPreferences, setPreJoinPreferences] = useState(null);

  // Video states
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [peers, setPeers] = useState(new Map());
  const [screenShares, setScreenShares] = useState(new Map()); // Map of peerId -> {stream, userName}
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
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [lastSeenMessageId, setLastSeenMessageId] = useState(null);
  
  // Track media states for remote participants (userId -> {audio: boolean, video: boolean})
  const [peerMediaStates, setPeerMediaStates] = useState(new Map());
  
  // Poll states
  const [polls, setPolls] = useState([]);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newPoll, setNewPoll] = useState({
    question: '',
    options: ['', '']
  });
  const [pollVotes, setPollVotes] = useState({}); // Track user's votes by poll ID
  const [unreadPollCount, setUnreadPollCount] = useState(0);
  const [lastSeenPollId, setLastSeenPollId] = useState(null);
  
  // Meeting features states
  const [handsRaised, setHandsRaised] = useState(new Set()); // Set of peer IDs (not userNames)
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showCodeSpace, setShowCodeSpace] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Live Caption states
  const [showCaptions, setShowCaptions] = useState(false);
  const [captions, setCaptions] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef(null);
  const lastResultTimeRef = useRef(Date.now());
  const watchdogTimerRef = useRef(null);
  
  // Pin state
  const [pinnedParticipant, setPinnedParticipant] = useState(null); // stores peerId or 'local'
  
  // Active speaker detection
  const [activeSpeaker, setActiveSpeaker] = useState(null); // stores peerId or 'local'
  const activeSpeakerTimerRef = useRef(null);
  
  // Mobile-specific states
  const [isMobileView, setIsMobileView] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  // Meeting title state
  const [meetingTitle, setMeetingTitle] = useState('');
  
  // Timer states
  const [meetingStartTime] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [meetingDuration, setMeetingDuration] = useState('00:00:00');
  const [meetingJoinedTime] = useState(new Date()); // Track when user joined
  
  // Persistent data states
  const [whiteboardData, setWhiteboardData] = useState(null);
  
  // Active tab in chat panel
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'polls', 'whiteboard', 'notepad'
  
  // Mark polls as read when user switches to polls tab
  useEffect(() => {
    if (activeTab === 'polls' && polls.length > 0) {
      // Mark the latest poll as seen
      const latestPoll = polls[polls.length - 1];
      setLastSeenPollId(latestPoll.firestoreId);
      setUnreadPollCount(0);
      console.log('📊 Polls marked as read, last seen:', latestPoll.firestoreId);
    }
  }, [activeTab, polls]);

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

  // Calculate dynamic grid layout based on participant count (Mobile-First Google Meet style)
  const getGridLayout = () => {
    const totalParticipants = participants.length + 1; // +1 for local user
    const hasPinned = !!pinnedParticipant;
    
    let gridClass = '';
    let containerClass = '';
    let pinnedClass = '';
    let gridVideoClass = '';
    let videoItemClass = '';
    let tilesPerPage = totalParticipants;
    let maxColumns = 2;
    
    // Mobile-specific calculations
    if (isMobileView) {
      if (hasPinned) {
        // Pinned layout on mobile: Full screen pinned + bottom thumbnail strip
        containerClass = 'w-full h-full flex flex-col gap-2 p-2 transition-all duration-500 ease-out';
        pinnedClass = 'w-full flex-1 min-h-0 flex items-center justify-center';
        gridClass = 'flex flex-nowrap gap-2 h-16 overflow-x-auto flex-shrink-0 pb-1 snap-x snap-mandatory';
        gridVideoClass = 'h-full w-24 flex-shrink-0 snap-center transform transition-all duration-500';
        return { gridClass, containerClass, singleVideoClass: null, pinnedClass, gridVideoClass, videoItemClass, hasPinned, totalParticipants, tilesPerPage, maxColumns };
      }
      
      if (totalParticipants === 1) {
        // Solo: Full screen on mobile
        gridClass = '';
        containerClass = 'flex items-center justify-center w-full h-full p-3 transition-all duration-500 ease-out';
        videoItemClass = 'transform transition-all duration-500 ease-out';
        return { 
          gridClass, 
          containerClass, 
          singleVideoClass: 'w-full h-full max-h-[80vh] aspect-[9/16]',
          videoItemClass,
          hasPinned,
          totalParticipants,
          tilesPerPage: 1,
          maxColumns: 1
        };
      } else if (totalParticipants === 2) {
        // 2 people: Stack vertically in portrait, side-by-side in landscape
        maxColumns = isPortrait ? 1 : 2;
        gridClass = `grid ${isPortrait ? 'grid-cols-1' : 'grid-cols-2'} gap-2 w-full h-full p-2 place-items-center transition-all duration-500 ease-out`;
        containerClass = 'w-full h-full overflow-hidden';
        videoItemClass = 'w-full aspect-[4/3] transform transition-all duration-500 ease-out touch-manipulation';
        tilesPerPage = 2;
      } else if (totalParticipants >= 3 && totalParticipants <= 4) {
        // 3-4 people: 2×2 grid
        maxColumns = 2;
        gridClass = 'grid grid-cols-2 gap-2 w-full p-2 auto-rows-fr transition-all duration-500 ease-out';
        containerClass = 'w-full h-full flex items-center justify-center overflow-hidden';
        videoItemClass = 'w-full aspect-[4/3] transform transition-all duration-500 ease-out touch-manipulation';
        tilesPerPage = 4;
      } else if (totalParticipants >= 5 && totalParticipants <= 9) {
        // 5-9 people: 3×3 grid (2 cols in portrait, 3 in landscape)
        maxColumns = isPortrait ? 2 : 3;
        gridClass = `grid ${isPortrait ? 'grid-cols-2' : 'grid-cols-3'} gap-2 w-full p-2 auto-rows-fr transition-all duration-500 ease-out`;
        containerClass = 'w-full h-full overflow-y-auto scroll-smooth snap-y snap-mandatory';
        videoItemClass = 'w-full aspect-[4/3] snap-start transform transition-all duration-500 ease-out touch-manipulation';
        tilesPerPage = isPortrait ? 6 : 9;
      } else {
        // 10+ people: Paginated grid with swipe navigation
        maxColumns = isPortrait ? 2 : 3;
        const tilesPerPageCalc = isPortrait ? 6 : 9;
        tilesPerPage = tilesPerPageCalc;
        gridClass = `grid ${isPortrait ? 'grid-cols-2' : 'grid-cols-3'} gap-2 w-full h-full p-2 auto-rows-fr transition-all duration-500 ease-out`;
        containerClass = 'w-full h-full overflow-hidden';
        videoItemClass = 'w-full aspect-[4/3] snap-center transform transition-all duration-500 ease-out touch-manipulation';
      }
      
      return { gridClass, containerClass, singleVideoClass: null, videoItemClass, hasPinned, totalParticipants, tilesPerPage, maxColumns };
    }
    
    // Desktop layout (existing logic)
    if (hasPinned) {
      containerClass = 'w-full h-full flex flex-col gap-3 p-3 transition-all duration-500 ease-out';
      pinnedClass = 'w-full flex-1 min-h-0 flex items-center justify-center';
      gridClass = 'flex flex-wrap gap-2 sm:gap-3 h-20 sm:h-24 overflow-x-auto flex-shrink-0 pb-2';
      gridVideoClass = 'h-full aspect-video flex-shrink-0 transform transition-all duration-500 hover:scale-105';
      return { gridClass, containerClass, singleVideoClass: null, pinnedClass, gridVideoClass, videoItemClass, hasPinned, totalParticipants, tilesPerPage, maxColumns };
    }
    
    if (totalParticipants === 1) {
      gridClass = '';
      containerClass = 'flex items-center justify-center w-full h-full p-4 sm:p-6 transition-all duration-500 ease-out';
      videoItemClass = 'transform transition-all duration-500 ease-out';
      return { 
        gridClass, 
        containerClass, 
        singleVideoClass: 'w-full max-w-6xl aspect-video',
        videoItemClass,
        hasPinned,
        totalParticipants,
        tilesPerPage: 1,
        maxColumns: 1
      };
    } else if (totalParticipants === 2) {
      gridClass = 'grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-6xl mx-auto transition-all duration-500 ease-out';
      containerClass = 'w-full h-full p-3 sm:p-4 flex items-center justify-center transition-all duration-500 ease-out';
      videoItemClass = 'w-full aspect-video transform transition-all duration-500 ease-out hover:scale-[1.02]';
      maxColumns = 2;
      tilesPerPage = 2;
    } else if (totalParticipants === 3 || totalParticipants === 4) {
      gridClass = 'grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-5xl mx-auto auto-rows-fr transition-all duration-500 ease-out';
      containerClass = 'w-full h-full p-3 sm:p-4 flex items-center justify-center transition-all duration-500 ease-out';
      videoItemClass = 'w-full aspect-video transform transition-all duration-500 ease-out hover:scale-[1.02]';
      maxColumns = 2;
      tilesPerPage = 4;
    } else if (totalParticipants >= 5 && totalParticipants <= 9) {
      gridClass = 'grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 w-full max-w-6xl mx-auto auto-rows-fr transition-all duration-500 ease-out';
      containerClass = 'w-full h-full p-2 sm:p-3 flex items-center justify-center transition-all duration-500 ease-out';
      videoItemClass = 'w-full aspect-video transform transition-all duration-500 ease-out hover:scale-[1.02]';
      maxColumns = 3;
      tilesPerPage = 9;
    } else {
      gridClass = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 w-full auto-rows-max content-start transition-all duration-500 ease-out';
      containerClass = 'w-full h-full p-2 sm:p-3 overflow-y-auto scroll-smooth transition-all duration-500 ease-out';
      videoItemClass = 'w-full aspect-video transform transition-all duration-500 ease-out hover:scale-[1.02]';
      maxColumns = 4;
      tilesPerPage = 12;
    }
    
    return { gridClass, containerClass, singleVideoClass: null, videoItemClass, hasPinned, totalParticipants, tilesPerPage, maxColumns };
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

  const { gridClass, containerClass, singleVideoClass, pinnedClass, gridVideoClass, videoItemClass, hasPinned, totalParticipants, tilesPerPage } = getGridLayout();

  // Callback ref for local video - fires when element mounts
  const localVideoCallbackRef = useCallback((videoElement) => {
    localVideoRef.current = videoElement;
    
    if (!videoElement || !localStream) {
      console.log('📹 Video callback - element:', !!videoElement, 'stream:', !!localStream);
      return;
    }
    
    console.log('🎥 Video element mounted! Attaching stream...');
    
    // Pause and reset before changing srcObject to prevent interruption
    if (videoElement.srcObject) {
      videoElement.pause();
    }
    
    videoElement.srcObject = localStream;
    
    // Wait for loadedmetadata before playing
    videoElement.onloadedmetadata = () => {
      const playPromise = videoElement.play();
      if (playPromise) {
        playPromise
          .then(() => console.log('✅ Local video playing'))
          .catch(err => {
            // Ignore interruption errors as they're expected during stream changes
            if (err.name !== 'AbortError') {
              console.warn('⚠️ Play failed:', err.message);
            }
          });
      }
    };
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
        const validation = await validateMeetingParticipant(roomId, currentUser.email, currentUser.uid);
        
        if (!validation.isAllowed) {
          setAccessDenied(true);
          setAccessDeniedReason(validation.reason);
          setIsValidating(false);
          return;
        }

        // Check if this is proctored mode
        const meeting = validation.meeting;
        const isProctoredAssessment = meeting?.isProctoredMode || false;
        const userIsHost = validation.isHost || false;
        
        setIsProctoredMode(isProctoredAssessment);
        setIsHost(userIsHost);

        // If proctored mode and not host, check and track attempts
        if (isProctoredAssessment && !userIsHost) {
          try {
            // Check if there's an active session (skip this check - allow rejoins)
            // This prevents "Unable to Join Meeting" error on page reload
            console.log('⏩ Skipping active session check to allow page reload');
            
            // Check attempt access
            const accessCheck = await checkAssessmentAccess(roomId, currentUser.email);
            
            if (!accessCheck.allowed) {
              setAccessDenied(true);
              setAccessDeniedReason(accessCheck.message || 'Maximum attempts reached. You cannot rejoin this assessment.');
              setIsValidating(false);
              return;
            }

            // Track attempt (this will update existing attempt if already in progress)
            const attemptResult = await trackAssessmentAttempt(roomId, currentUser.email, currentUser.uid);
            setAttemptInfo(attemptResult);
            
            console.log(`✅ Assessment attempt ${attemptResult.attemptCount} of ${attemptResult.maxAttempts} recorded`);
          } catch (error) {
            console.error('Error checking assessment access:', error);
            setAccessDenied(true);
            setAccessDeniedReason('Unable to validate assessment access. Please try again.');
            setIsValidating(false);
            return;
          }
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
    
    // Pause and reset before changing srcObject to prevent interruption
    if (videoElement.srcObject) {
      videoElement.pause();
    }
    
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
            // Ignore AbortError during stream changes
            if (err.name !== 'AbortError') {
              console.error('❌ Video play failed:', err);
              console.log('💡 Try clicking on your video box');
            }
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

  // Initialize video call ONLY after validation succeeds AND pre-join is completed
  useEffect(() => {
    // Don't initialize if still validating, access is denied, or pre-join hasn't been completed
    if (isValidating || accessDenied || !preJoinPreferences) {
      return;
    }
    
    initializeVideoCall();
    
    // Cleanup on unmount
    const handleBeforeUnload = () => {
      console.log('📴 Page unloading, cleaning up...');
      
      // Update attempt status if in proctored mode
      if (isProctoredMode && !isHost && currentUser?.email) {
        // Use sendBeacon for reliable status update on page unload
        // Note: In production, you would need a backend endpoint to handle this
        // For now, we'll update the status in the beforeunload handler
        
        // TODO: Implement sendBeacon to backend endpoint for reliable tracking
        // Example: navigator.sendBeacon('/api/attempt/complete', JSON.stringify({
        //   meetingId: roomId,
        //   userEmail: currentUser.email,
        //   status: 'disconnected'
        // }));
        updateAttemptStatus(roomId, currentUser.email, 'disconnected').catch(err => 
          console.error('Failed to update attempt status on unload:', err)
        );
      }
      
      // Use sendBeacon for reliable cleanup on page unload
      if (roomId && peerRef.current && peerRef.current.id) {
        // sendBeacon doesn't support custom methods, so we use query params
        const url = `/api/peer-discovery/${roomId}?userId=${peerRef.current.id}&action=delete`;
        navigator.sendBeacon(url);
      }
      cleanup();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValidating, accessDenied, preJoinPreferences]);

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

  // Mobile detection and orientation tracking
  useEffect(() => {
    const checkMobileView = () => {
      const isMobile = window.innerWidth <= 768;
      const isPortraitMode = window.innerHeight > window.innerWidth;
      
      setIsMobileView(isMobile);
      setIsPortrait(isPortraitMode);
      
      console.log('📱 Mobile view:', isMobile, 'Portrait:', isPortraitMode);
    };

    // Initial check
    checkMobileView();

    // Listen for resize and orientation changes
    window.addEventListener('resize', checkMobileView);
    window.addEventListener('orientationchange', checkMobileView);

    return () => {
      window.removeEventListener('resize', checkMobileView);
      window.removeEventListener('orientationchange', checkMobileView);
    };
  }, []);

  // Touch gesture handlers for mobile swipe navigation
  const handleTouchStart = (e) => {
    if (!isMobileView || totalParticipants <= tilesPerPage) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!isMobileView || totalParticipants <= tilesPerPage) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isMobileView || totalParticipants <= tilesPerPage) return;
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    const totalPages = Math.ceil(totalParticipants / tilesPerPage);
    
    if (isLeftSwipe && currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
      console.log('👈 Swipe left, page:', currentPage + 1);
    }
    
    if (isRightSwipe && currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      console.log('👉 Swipe right, page:', currentPage - 1);
    }
  };

  // Auto-pin active speaker on mobile
  useEffect(() => {
    if (isMobileView && activeSpeaker && !pinnedParticipant && totalParticipants >= 3) {
      console.log('📱 Auto-pinning active speaker on mobile:', activeSpeaker);
      setPinnedParticipant(activeSpeaker);
    }
  }, [activeSpeaker, isMobileView, pinnedParticipant, totalParticipants]);

  // Active Speaker Detection using Web Audio API
  useEffect(() => {
    if (!localStream && peers.size === 0) return;

    const audioContexts = new Map();
    const analyzers = new Map();
    
    const detectActiveSpeaker = () => {
      let maxVolume = 0;
      let activePeer = null;

      // Check local audio level
      if (localStream && isMicOn) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack && audioTrack.enabled) {
          try {
            if (!audioContexts.has('local')) {
              const audioContext = new (window.AudioContext || window.webkitAudioContext)();
              const analyser = audioContext.createAnalyser();
              analyser.fftSize = 512;
              analyser.smoothingTimeConstant = 0.8;
              
              const source = audioContext.createMediaStreamSource(localStream);
              source.connect(analyser);
              
              audioContexts.set('local', audioContext);
              analyzers.set('local', analyser);
            }
            
            const analyser = analyzers.get('local');
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            if (average > maxVolume) {
              maxVolume = average;
              activePeer = 'local';
            }
          } catch (err) {
            console.warn('⚠️ Local audio analysis error:', err);
          }
        }
      }

      // Check remote peers' audio levels
      peers.forEach((peerData, peerId) => {
        if (peerData.stream) {
          const audioTracks = peerData.stream.getAudioTracks();
          if (audioTracks.length > 0 && audioTracks[0].enabled) {
            try {
              if (!audioContexts.has(peerId)) {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 512;
                analyser.smoothingTimeConstant = 0.8;
                
                const source = audioContext.createMediaStreamSource(peerData.stream);
                source.connect(analyser);
                
                audioContexts.set(peerId, audioContext);
                analyzers.set(peerId, analyser);
              }
              
              const analyser = analyzers.get(peerId);
              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(dataArray);
              
              // Calculate average volume
              const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
              if (average > maxVolume && average > 20) { // Threshold to avoid noise
                maxVolume = average;
                activePeer = peerId;
              }
            } catch (err) {
              console.warn(`⚠️ Audio analysis error for ${peerId}:`, err);
            }
          }
        }
      });

      // Update active speaker with debouncing
      if (maxVolume > 20) { // Minimum threshold
        if (activeSpeakerTimerRef.current) {
          clearTimeout(activeSpeakerTimerRef.current);
        }
        
        activeSpeakerTimerRef.current = setTimeout(() => {
          setActiveSpeaker(activePeer);
        }, 500); // 500ms delay to avoid flickering
      } else {
        // Clear active speaker after 2 seconds of silence
        if (activeSpeakerTimerRef.current) {
          clearTimeout(activeSpeakerTimerRef.current);
        }
        activeSpeakerTimerRef.current = setTimeout(() => {
          setActiveSpeaker(null);
        }, 2000);
      }
    };

    // Run detection every 200ms
    const intervalId = setInterval(detectActiveSpeaker, 200);

    return () => {
      clearInterval(intervalId);
      if (activeSpeakerTimerRef.current) {
        clearTimeout(activeSpeakerTimerRef.current);
      }
      
      // Cleanup audio contexts
      audioContexts.forEach((context) => {
        context.close().catch(err => console.warn('Audio context close error:', err));
      });
      audioContexts.clear();
      analyzers.clear();
    };
  }, [localStream, peers, isMicOn]);

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
  
  // Firebase Real-Time Chat Listener
  useEffect(() => {
    if (!roomId) return;
    
    console.log('🔥 [FIREBASE] Setting up real-time chat listener');
    const unsubscribe = subscribeToChatMessages(roomId, (newMessages) => {
      console.log('💬 [FIREBASE] Received messages:', newMessages.length);
      
      // Calculate unread messages
      if (!showChat) {
        const lastSeenIndex = lastSeenMessageId 
          ? newMessages.findIndex(msg => msg.firestoreId === lastSeenMessageId)
          : -1;
        
        const unreadCount = lastSeenIndex >= 0 
          ? newMessages.length - lastSeenIndex - 1 
          : newMessages.length;
        
        setUnreadMessageCount(unreadCount > 0 ? unreadCount : 0);
      }
      
      setMessages(newMessages);
    });
    
    return () => {
      console.log('🔥 [FIREBASE] Cleaning up chat listener');
      unsubscribe();
    };
  }, [roomId, showChat, lastSeenMessageId]);
  
  // Mark messages as read when chat is opened
  useEffect(() => {
    if (showChat && messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      setLastSeenMessageId(latestMessage.firestoreId);
      setUnreadMessageCount(0);
      console.log('📖 Messages marked as read');
    }
  }, [showChat, messages]);
  
  // Firebase Real-Time Polls Listener with Notification
  useEffect(() => {
    if (!roomId) return;
    
    let previousPollCount = 0;
    
    console.log('🔥 [FIREBASE] Setting up real-time polls listener');
    const unsubscribe = subscribeToPolls(roomId, (newPolls) => {
      console.log('📊 [FIREBASE] Received polls:', newPolls.length);
      
      // Show notification alert when a new poll is created
      if (newPolls.length > previousPollCount && previousPollCount > 0) {
        const latestPoll = newPolls[newPolls.length - 1];
        // Show visual notification
        showPollNotification(latestPoll);
      }
      
      previousPollCount = newPolls.length;
      setPolls(newPolls);
      
      // Calculate unread poll count
      if (newPolls.length > 0) {
        if (!lastSeenPollId) {
          // First time seeing polls, all are unread
          setUnreadPollCount(newPolls.length);
        } else {
          // Find index of last seen poll
          const lastSeenIndex = newPolls.findIndex(poll => poll.firestoreId === lastSeenPollId);
          if (lastSeenIndex !== -1) {
            // Count polls after the last seen one
            const unreadCount = newPolls.length - lastSeenIndex - 1;
            setUnreadPollCount(Math.max(0, unreadCount));
          } else {
            // Last seen poll not found, consider all unread
            setUnreadPollCount(newPolls.length);
          }
        }
      } else {
        setUnreadPollCount(0);
      }
    });
    
    return () => {
      console.log('🔥 [FIREBASE] Cleaning up polls listener');
      unsubscribe();
    };
  }, [roomId, lastSeenPollId]);
  
  // Show poll notification
  const showPollNotification = (poll) => {
    // Create a visual notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-slide-in-right border-2 border-white/20';
    notification.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <p class="font-semibold text-sm">New Poll Created!</p>
          <p class="text-xs text-white/90 mt-0.5">${poll.question?.substring(0, 40)}${poll.question?.length > 40 ? '...' : ''}</p>
        </div>
      </div>
    `;
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slide-out-right 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Play notification sound if available
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIF2m98OScTgwOUKzn77ZfGwU7ldfyz3QtBSl+zPLaizsKGGS564yjVRQJRp3j8L1rIAUsgs/y2Ik2CAdpu/Dkm04MDlCs5+62XhoFO5XX8s9zLgUpfszx2Ys6ChhlueuMo1UUCUWd4/C9ayAFLILP8tmJNwgHabvw5JtODA5QrOfutl4aBTuU1/LPcy4FKX7M8dmLOgoYZbnrjKNVFAlFneHwvWsgBSyCzvLZiTcIB2m78OSbTgwOUKzn7rZeGgU7lNfyz3MuBSl+zPHZizoKGGW564yjVRQJRZ3h8L1rIAUsgs7y2Yk3CAdpu/Dkm04MDlCs5+62XhoFO5TX8s9zLgUpfszx2Ys6ChhlueuMo1UUCUWd4fC9ayAFLILO8tmJNwgHabvw5JtODA5QrOfutl4aBTuU1/LPcy4FKX7M8dmLOgoYZbnrjKNVFAlFneHwvWsgBSyCzvLZiTcIB2m78OSbTgwOUKzn7rZeGgU7lNfyz3MuBSl+zPHZizoKGGW564yjVRQJRZ3h8L1rIAUsgs7y2Yk3CAdpu/Dkm04MDlCs5+62XhoFO5XX8s9zLgUpfszx2Ys6ChhlueuMo1UUCUWd4fC9ayAFLILO8tmJNwgHabvw5JtODA5QrOfutl4aBTuU1/LPcy4FKX7M8dmLOgoYZbnrjKNVFAlFneHwvWsgBSyCzvLZiTcIB2m78OSbTgwOUKzn7rZeGgU7lNfyz3MuBSl+zPHZizoKGGW564yjVRQJRZ3h8L1rIAUsgs7y2Yk3CAdpu/Dkm04MDlCs5+62XhoFO5TX8s9zLgUpfszx2Ys6ChhlueuMo1UUCUWd4fC9ayAFLILO8tmJNwgHabvw5JtODA5QrOfutl4aBTuU1/LPcy4FKX7M8dmLOgoYZbnrjKNVFAlFneHwvWsgBQ==');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  };
  
  // Poll for reactions, hand raises, and media states from other participants (every 3 seconds)
  // NOTE: Messages and polls are now handled by Firebase real-time listeners above
  useEffect(() => {
    if (!roomId) return;
    
    const seenReactionIds = new Set();
    
    const pollReactionsAndHandsAndMedia = async () => {
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
        
        // Poll for media states (mic/camera status) - every 3 seconds for stability
        const mediaResponse = await fetch(`${serverUrl}/api/socket?roomId=${roomId}&type=media-states`);
        if (mediaResponse.ok) {
          const mediaData = await mediaResponse.json();
          if (mediaData.mediaStates && typeof mediaData.mediaStates === 'object') {
            const stateCount = Object.keys(mediaData.mediaStates).length;
            if (stateCount > 0) {
              console.log(`📹🎤 [POLL] Received ${stateCount} media states:`, mediaData.mediaStates);
            }
            setPeerMediaStates(prevStates => {
              const newStates = new Map(prevStates);
              // Update with new data from server
              Object.entries(mediaData.mediaStates).forEach(([userId, state]) => {
                const prevState = prevStates.get(userId);
                if (!prevState || prevState.audio !== state.audio || prevState.video !== state.video) {
                  console.log(`📹🎤 [POLL] Media state changed for ${userId}:`, state);
                }
                newStates.set(userId, state);
              });
              return newStates;
            });
          }
        }
      } catch (error) {
        // Silently fail - don't spam console
      }
    };
    
    // Poll every 3 seconds for better stability
    const interval = setInterval(pollReactionsAndHandsAndMedia, 3000);
    
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
      
      // ALWAYS request media with real tracks for proper WebRTC negotiation
      // Even if user wants devices off, we need tracks for bidirectional communication
      // We'll disable tracks immediately after if user doesn't want them on
      const wantVideo = preJoinPreferences?.videoEnabled ?? true;
      const wantAudio = preJoinPreferences?.micEnabled ?? true;
      
      console.log('📹 Pre-join preferences - Video:', wantVideo, 'Audio:', wantAudio);
      
      try {
        // Always request both video and audio to ensure proper WebRTC negotiation
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
        
        console.log('✅ Got media stream with tracks');
        
        // Immediately disable tracks based on user preferences
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        
        if (videoTrack && !wantVideo) {
          videoTrack.enabled = false;
          console.log('📹 Video track disabled per user preference');
        }
        if (audioTrack && !wantAudio) {
          audioTrack.enabled = false;
          console.log('🎤 Audio track disabled per user preference');
        }
        
        setIsCameraOn(wantVideo && !!videoTrack);
        setIsMicOn(wantAudio && !!audioTrack);
        setLocalStream(stream);
        
      } catch (errBoth) {
        console.warn('⚠️ getUserMedia(video+audio) failed:', errBoth);
        // Fallback: Try video-only
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1920, max: 1920 },
              height: { ideal: 1080, max: 1080 },
              frameRate: { ideal: 60, max: 60 }
            },
            audio: false
          });
          
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack && !wantVideo) {
            videoTrack.enabled = false;
          }
          setIsCameraOn(wantVideo && !!videoTrack);
          setIsMicOn(false);
          setLocalStream(stream);
          setError('Microphone access failed. You can join with camera only.');
          
        } catch (errVideo) {
          console.warn('⚠️ getUserMedia(video-only) failed:', errVideo);
          // Fallback: Try audio-only
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              }
            });
            
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack && !wantAudio) {
              audioTrack.enabled = false;
            }
            setIsCameraOn(false);
            setIsMicOn(wantAudio && !!audioTrack);
            setLocalStream(stream);
            setError('Camera access failed. You can join with audio only.');
            
          } catch (errAudio) {
            console.error('❌ All media attempts failed:', errAudio);
            // Last resort: Create empty stream (user truly has no devices)
            // Note: This may cause issues with receiving remote streams
            console.warn('⚠️ Creating empty stream - remote stream reception may be limited');
            stream = new MediaStream();
            setIsCameraOn(false);
            setIsMicOn(false);
            setLocalStream(stream);
            setError('No camera or microphone available. You may not be able to see/hear others properly.');
          }
        }
      }
      
      // Log final stream state
      if (stream) {
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          console.log('📷 Video track settings:', settings);
          console.log('📷 Actual resolution:', settings.width + 'x' + settings.height, '@', settings.frameRate + 'fps');
          console.log('📷 Video enabled:', videoTrack.enabled);
        }
        if (audioTrack) {
          const settings = audioTrack.getSettings();
          console.log('🎤 Audio settings - Sample rate:', settings.sampleRate, 'Hz');
          console.log('🎤 Audio enabled:', audioTrack.enabled);
        }
        
        console.log('🎥 Final stream state - Video tracks:', stream.getVideoTracks().length, 
          'Audio tracks:', stream.getAudioTracks().length);
      }

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
        
        // Broadcast initial media state to other participants
        const broadcastInitialMediaState = async () => {
          try {
            const videoTrack = stream?.getVideoTracks()[0];
            const audioTrack = stream?.getAudioTracks()[0];
            const cameraEnabled = videoTrack ? videoTrack.enabled : false;
            const micEnabled = audioTrack ? audioTrack.enabled : false;
            
            console.log('📹🎤 Broadcasting initial media state - camera:', cameraEnabled, 'mic:', micEnabled);
            
            // Broadcast camera state
            await fetch('/api/socket', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                roomId,
                type: 'media-state',
                userId: peerId,
                userName,
                mediaType: 'video',
                enabled: cameraEnabled
              })
            });
            
            // Broadcast mic state
            await fetch('/api/socket', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                roomId,
                type: 'media-state',
                userId: peerId,
                userName,
                mediaType: 'audio',
                enabled: micEnabled
              })
            });
            
            console.log('✅ Initial media state broadcasted successfully');
          } catch (err) {
            console.error('❌ Error broadcasting initial media state:', err);
          }
        };
        broadcastInitialMediaState();
        
        // Try to join via Socket.IO if available
        if (socketRef.current && socketRef.current.connected) {
          console.log('🔌 Joining meeting via Socket.IO');
          socketRef.current.emit('join-meeting', roomId, peerId, userName, userEmail);
        } else {
          console.warn('⚠️ Socket.IO not available, using API-based peer discovery');
          
          // Register this peer and get list of existing peers via API
          const registerPeer = async () => {
            try {
              const response = await fetch(`/api/peer-discovery/${roomId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  peerId: peerId, 
                  userId: currentUser?.uid || userEmail, 
                  userName, 
                  userEmail, 
                  profilePicUrl: userProfilePic, 
                  isHost 
                })
              });
              
              const result = await response.json();
              console.log('📡 Peer discovery response:', result);
              
              if (result.success && result.peers) {
                console.log(`📋 Found ${result.peers.length} existing peer(s)`);
                console.log('🔍 My PeerID:', peerId);
                
                // Call each existing peer (skip ourselves)
                result.peers.forEach(peerData => {
                  console.log('👤 Peer data from API:', peerData);
                  
                  // Extra safety check: Skip if this is our own peer ID
                  if (peerData.peerId === peerId) {
                    console.warn('⚠️ Skipping self from peer list:', peerData.userName);
                    return;
                  }
                  
                  // Ensure we have userName (fallback to userId if missing)
                  if (!peerData.userName || peerData.userName === 'Anonymous') {
                    console.warn('⚠️ Peer missing userName, using fallback');
                    peerData.userName = peerData.userEmail?.split('@')[0] || `User-${peerData.userId.slice(0, 8)}`;
                  }
                  
                  // Prevent duplicate calls
                  if (activeCallsRef.current.has(peerData.peerId)) {
                    console.log('⏭️ Skipping duplicate call to:', peerData.userName);
                    return;
                  }
                  
                  console.log('📞 Calling existing peer via API:', peerData.userName, 'peerId:', peerData.peerId);
                  
                  // Add delay and retry logic for more reliable connections
                  const attemptCall = (retryCount = 0) => {
                    setTimeout(() => {
                      try {
                        if (!stream) {
                          console.warn('⚠️ No stream - skipping call');
                          return;
                        }
                        
                        // In proctored mode handling
                        let streamToSend = stream;
                        if (isProctoredMode) {
                          if (!isHost) {
                            // PARTICIPANT logic: ALWAYS send real stream to host for monitoring
                            const peerIsHost = peerData.isHost || peerData.isMonitor || false;
                            if (peerIsHost) {
                              // Send real stream to host/monitor for monitoring (CRITICAL FOR PROCTORING)
                              streamToSend = stream && stream.active ? stream : new MediaStream();
                              console.log('🔒 [PARTICIPANT] Calling HOST/MONITOR with real stream for monitoring', {
                                hasVideo: stream?.getVideoTracks().length > 0,
                                hasAudio: stream?.getAudioTracks().length > 0
                              });
                            } else {
                              // Send empty stream to other participants (they shouldn't see each other in exam)
                              streamToSend = new MediaStream();
                              console.log('🔒 [PARTICIPANT] Calling participant with empty stream');
                            }
                          } else {
                            // HOST/MONITOR logic: Can send empty stream to participants (they don't need to see host)
                            streamToSend = new MediaStream();
                            console.log('🔒 [HOST/MONITOR] Calling participant with empty stream (one-way monitoring)');
                          }
                        }
                        
                        // Allow calls even with empty streams so participants can see each other
                        const hasLocalTracks = streamToSend.getVideoTracks().length > 0 || streamToSend.getAudioTracks().length > 0;
                        console.log('📞 Calling peer:', peerData.userName, '(isHost:', peerData.isHost, ') with stream tracks:', streamToSend.getVideoTracks().length, 'video,', streamToSend.getAudioTracks().length, 'audio');
                        
                        const call = peer.call(peerData.peerId, streamToSend, {
                          metadata: { userName, userEmail, userProfilePic, isHost, userId: currentUser?.uid || userEmail },
                          sdpTransform: (sdp) => {
                            // Increase bandwidth for 1080p60
                            return sdp.replace(/b=AS:(\d+)/g, 'b=AS:5000')
                                      .replace(/b=TIAS:(\d+)/g, 'b=TIAS:5000000');
                          }
                        });
                        
                        if (call) {
                          activeCallsRef.current.set(peerData.peerId, call);
                          console.log('✅ Call initiated to:', peerData.userName);
                          
                          // Only immediately add peer with empty stream in proctored mode
                          // In normal mode, streams have actual tracks (even if disabled), so stream event will fire
                          if (!hasLocalTracks && isProctoredMode) {
                            console.log('🔄 [PROCTORED] Calling with empty stream, immediately adding peer');
                            setTimeout(() => {
                              addPeer(peerData.peerId, new MediaStream(), peerData.userName, peerData.profilePicUrl, peerData.isHost, peerData.userId);
                            }, 500);
                          }
                          
                          let streamReceived = false;
                          
                          call.on('stream', (remoteStream) => {
                            streamReceived = true;
                            console.log('📹 Received stream from:', peerData.userName, '(isHost:', peerData.isHost, ')');
                            console.log('📹 Stream details:', {
                              id: remoteStream.id,
                              active: remoteStream.active,
                              video: remoteStream.getVideoTracks().length,
                              audio: remoteStream.getAudioTracks().length
                            });
                            
                            // Log video track status
                            const videoTrack = remoteStream.getVideoTracks()[0];
                            if (videoTrack) {
                              console.log('📹 Video track:', {
                                id: videoTrack.id,
                                enabled: videoTrack.enabled,
                                muted: videoTrack.muted,
                                readyState: videoTrack.readyState,
                                label: videoTrack.label
                              });
                            } else {
                              console.log('⚠️ No video track in received stream');
                            }
                            
                            // In proctored mode, log who's receiving from whom
                            if (isProctoredMode) {
                              if (isHost) {
                                console.log('🎯 [HOST] Received stream from PARTICIPANT:', peerData.userName);
                                console.log('🎯 [HOST] Stream has', remoteStream.getVideoTracks().length, 'video tracks,', remoteStream.getAudioTracks().length, 'audio tracks');
                              } else {
                                if (peerData.isHost) {
                                  console.log('🎯 [PARTICIPANT] Received stream from HOST:', peerData.userName);
                                } else {
                                  console.log('🎯 [PARTICIPANT] Received stream from peer:', peerData.userName);
                                }
                              }
                            }
                            
                            console.log('➕ Adding peer to peers map:', peerData.userName);
                            addPeer(peerData.peerId, remoteStream, peerData.userName, peerData.profilePicUrl, peerData.isHost, peerData.userId);
                          });
                          
                          call.on('close', () => {
                            console.log('📞 Call closed:', peerData.userName);
                            activeCallsRef.current.delete(peerData.peerId);
                            removePeer(peerData.peerId);
                          });
                          
                          call.on('error', (err) => {
                            console.error('❌ Call error with', peerData.userName, ':', err);
                            activeCallsRef.current.delete(peerData.peerId);
                            
                            // Retry on peer-unavailable error (up to 2 times)
                            if (err.type === 'peer-unavailable' && retryCount < 2) {
                              console.log(`🔄 Retrying call to ${peerData.userName} (attempt ${retryCount + 2}/3)`);
                              attemptCall(retryCount + 1);
                            }
                          });
                          
                          // Timeout fallback - only in proctored mode or if truly no tracks
                          // In normal mode with tracks, stream event should always fire
                          setTimeout(() => {
                            if (!streamReceived && activeCallsRef.current.has(peerData.peerId)) {
                              if (isProctoredMode || !hasLocalTracks) {
                                console.warn('⏱️ No stream received from', peerData.userName, 'after 5s, adding with empty stream');
                                const emptyStream = new MediaStream();
                                addPeer(peerData.peerId, emptyStream, peerData.userName, peerData.profilePicUrl, peerData.isHost, peerData.userId);
                              } else {
                                console.warn('⏱️ No stream received from', peerData.userName, 'after 5s - connection may have issues');
                              }
                            }
                          }, 5000);
                        } else {
                          console.error('❌ Failed to create call to:', peerData.userName);
                        }
                      } catch (callError) {
                        console.error('❌ Exception calling peer:', peerData.userName, callError);
                      }
                    }, 1000 + (retryCount * 2000)); // Increase delay for retries
                  };
                  
                  attemptCall();
                });
              }
            } catch (error) {
              console.error('❌ Error registering peer:', error);
            }
          };
          
          registerPeer();
          
          // Retry peer discovery after 2 seconds to catch simultaneous joins
          setTimeout(() => {
            console.log('🔄 Retrying peer discovery to catch simultaneous joins...');
            registerPeer();
          }, 2000);
          
          // Another retry after 4 seconds for better coverage
          setTimeout(() => {
            console.log('🔄 Second retry of peer discovery...');
            registerPeer();
          }, 4000);
          
          // Fast polling for first 30 seconds (every 2 seconds) to catch simultaneous joins
          let fastPollCount = 0;
          const maxFastPolls = 15; // 30 seconds
          const fastPollInterval = setInterval(async () => {
            fastPollCount++;
            if (fastPollCount >= maxFastPolls) {
              clearInterval(fastPollInterval);
              console.log('✅ Fast polling period complete');
              return;
            }
            
            try {
              const response = await fetch(`/api/peer-discovery/${roomId}?userId=${peerId}`);
              const result = await response.json();
              
              if (result.success && result.peers) {
                const newPeers = result.peers.filter(p => 
                  p.peerId !== peerId && !activeCallsRef.current.has(p.peerId)
                );
                
                if (newPeers.length > 0) {
                  console.log(`🚀 Fast poll found ${newPeers.length} new peer(s)`);
                  
                  newPeers.forEach(peerData => {
                    // Ensure we have userName (fallback to userId if missing)
                    if (!peerData.userName || peerData.userName === 'Anonymous') {
                      console.warn('⚠️ Fast poll peer missing userName, using fallback');
                      peerData.userName = peerData.userEmail?.split('@')[0] || `User-${peerData.userId.slice(0, 8)}`;
                    }
                    
                    if (!stream) {
                      console.warn('⚠️ No stream - skipping fast poll call');
                      return;
                    }
                    
                    // In proctored mode (non-host), check if we're calling a host
                    let streamToSend = stream;
                    if (isProctoredMode && !isHost) {
                    const peerIsHost = peerData.isHost || peerData.isMonitor || false;
                    if (peerIsHost) {
                      // ALWAYS send real stream to host/monitor for monitoring
                      streamToSend = stream && stream.active ? stream : new MediaStream();
                      console.log('🔒 Fast poll - Calling HOST/MONITOR with real stream for monitoring');
                      }
                    }
                    
                    const hasLocalTracks = streamToSend.getVideoTracks().length > 0 || streamToSend.getAudioTracks().length > 0;
                    console.log('📞 Calling peer from fast poll:', peerData.userName, '(isHost:', peerData.isHost, ')');
                    const call = peer.call(peerData.peerId, streamToSend, {
                      metadata: { userName, userEmail, userProfilePic, isHost },
                      sdpTransform: (sdp) => {
                        return sdp.replace(/b=AS:(\\d+)/g, 'b=AS:5000')
                                  .replace(/b=TIAS:(\\d+)/g, 'b=TIAS:5000000');
                      }
                    });
                    
                    if (call) {
                      activeCallsRef.current.set(peerData.peerId, call);
                      
                      // Only immediately add peer with empty stream in proctored mode
                      if (!hasLocalTracks && isProctoredMode) {
                        console.log('🔄 [PROCTORED] Fast poll with empty stream, immediately adding peer');
                        setTimeout(() => {
                          addPeer(peerData.peerId, new MediaStream(), peerData.userName, peerData.profilePicUrl, peerData.isHost, peerData.userId);
                        }, 500);
                      }
                      
                      let streamReceived = false;
                      
                      call.on('stream', (remoteStream) => {
                        streamReceived = true;
                        console.log('📹 Stream received (fast poll):', peerData.userName);
                        addPeer(peerData.peerId, remoteStream, peerData.userName, peerData.profilePicUrl, peerData.isHost, peerData.userId);
                      });
                      
                      call.on('close', () => {
                        activeCallsRef.current.delete(peerData.peerId);
                        removePeer(peerData.peerId);
                      });
                      
                      call.on('error', (err) => {
                        console.error('❌ Fast poll call error:', err);
                        activeCallsRef.current.delete(peerData.peerId);
                      });
                      
                      // Timeout fallback - only in proctored mode
                      setTimeout(() => {
                        if (!streamReceived && activeCallsRef.current.has(peerData.peerId)) {
                          if (isProctoredMode || !hasLocalTracks) {
                            console.warn('⏱️ Fast poll: No stream from', peerData.userName, 'adding with empty stream');
                            addPeer(peerData.peerId, new MediaStream(), peerData.userName, peerData.profilePicUrl, peerData.isHost, peerData.userId);
                          }
                        }
                      }, 5000);
                    }
                  });
                }
              }
            } catch (error) {
              console.error('❌ Fast poll error:', error);
            }
          }, 2000); // Poll every 2 seconds for 30 seconds
          
          // Poll for new peers every 3 seconds (faster than old 5s for quicker discovery)
          const pollInterval = setInterval(async () => {
            try {
              const response = await fetch(`/api/peer-discovery/${roomId}?userId=${peerId}`);
              const result = await response.json();
              
              if (result.success && result.peers) {
                // Filter out ourselves and peers we're already connected to
                const newPeers = result.peers.filter(p => 
                  p.peerId !== peerId && !activeCallsRef.current.has(p.peerId)
                );
                
                if (newPeers.length > 0) {
                  console.log(`📞 Found ${newPeers.length} new peer(s) via polling`);
                }
                
                newPeers.forEach(peerData => {
                  // Ensure we have userName (fallback to userId if missing)
                  if (!peerData.userName || peerData.userName === 'Anonymous') {
                    console.warn('⚠️ Poll peer missing userName, using fallback');
                    peerData.userName = peerData.userEmail?.split('@')[0] || `User-${peerData.userId.slice(0, 8)}`;
                  }
                  
                  console.log('📞 New peer detected via polling:', peerData.userName);
                  
                  if (!stream) {
                    console.warn('⚠️ No stream - skipping poll call');
                    return;
                  }
                  
                  // In proctored mode (non-host), check if we're calling a host
                  let streamToSend = stream;
                  if (isProctoredMode && !isHost) {
                    const peerIsHost = peerData.isHost || peerData.isMonitor || false;
                    if (peerIsHost) {
                      // ALWAYS send real stream to host/monitor for monitoring
                      streamToSend = stream && stream.active ? stream : new MediaStream();
                      console.log('🔒 Poll - Calling HOST/MONITOR with real stream for monitoring');
                    } else {
                      streamToSend = new MediaStream();
                      console.log('🔒 Poll - Calling participant with empty stream');
                    }
                  }
                  
                  const hasLocalTracks = streamToSend.getVideoTracks().length > 0 || streamToSend.getAudioTracks().length > 0;
                  
                  const call = peer.call(peerData.peerId, streamToSend, {
                    metadata: { userName, userEmail, userProfilePic, isHost, userId: currentUser?.uid || userEmail },
                    sdpTransform: (sdp) => {
                      // Increase bandwidth for 1080p60
                      return sdp.replace(/b=AS:(\d+)/g, 'b=AS:5000')
                                .replace(/b=TIAS:(\d+)/g, 'b=TIAS:5000000');
                    }
                  });
                  
                  if (call) {
                    activeCallsRef.current.set(peerData.peerId, call);
                    
                    // Only immediately add peer with empty stream in proctored mode
                    if (!hasLocalTracks && isProctoredMode) {
                      console.log('🔄 [PROCTORED] Poll with empty stream, immediately adding peer');
                      setTimeout(() => {
                        addPeer(peerData.peerId, new MediaStream(), peerData.userName, peerData.profilePicUrl, peerData.isHost, peerData.userId);
                      }, 500);
                    }
                    
                    let streamReceived = false;
                    
                    call.on('stream', (remoteStream) => {
                      streamReceived = true;
                      console.log('📹 Received stream from new peer:', peerData.userName);
                      addPeer(peerData.peerId, remoteStream, peerData.userName, peerData.profilePicUrl, peerData.isHost, peerData.userId);
                    });
                    
                    call.on('close', () => {
                      activeCallsRef.current.delete(peerData.peerId);
                      removePeer(peerData.peerId);
                    });
                    
                    call.on('error', (err) => {
                      console.error('❌ Call error:', err);
                      activeCallsRef.current.delete(peerData.peerId);
                    });
                    
                    // Timeout fallback - only in proctored mode
                    setTimeout(() => {
                      if (!streamReceived && activeCallsRef.current.has(peerData.peerId)) {
                        if (isProctoredMode || !hasLocalTracks) {
                          console.warn('⏱️ Poll: No stream from', peerData.userName, 'adding with empty stream');
                          addPeer(peerData.peerId, new MediaStream(), peerData.userName, peerData.profilePicUrl, peerData.isHost, peerData.userId);
                        }
                      }
                    }, 5000);
                  }
                });
              }
            } catch (error) {
              console.error('❌ Error polling for peers:', error);
            }
          }, 3000);
          
          // Heartbeat to keep this peer alive in the API (every 2 seconds to match 5s cleanup)
          const heartbeatInterval = setInterval(async () => {
            try {
              await fetch(`/api/peer-discovery/${roomId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  peerId: peerId, 
                  userId: currentUser?.uid || userEmail, 
                  userName, 
                  userEmail, 
                  profilePicUrl: userProfilePic, 
                  isHost 
                })
              });
              console.log('❤️ Heartbeat sent - keeping peer alive');
            } catch (error) {
              console.error('❌ Heartbeat error:', error);
            }
          }, 2000);
          
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
        console.log('🎥 Local stream available:', !!stream, 'Stream active:', stream?.active);
        console.log('🎥 Stream tracks - Video:', stream?.getVideoTracks().length, 'Audio:', stream?.getAudioTracks().length);
        console.log('🎥 Current user role - isProctoredMode:', isProctoredMode, 'isHost:', isHost);
        console.log('🎥 Caller role - callerIsHost:', call.metadata?.isHost);
        
        // In proctored mode handling
        if (isProctoredMode) {
          if (!isHost) {
            // PARTICIPANT receiving call
            const callerIsHost = call.metadata?.isHost || call.metadata?.isMonitor || false;
            if (callerIsHost) {
              // ALWAYS answer host/monitor with real stream so they can monitor
              console.log('🔒 [PARTICIPANT] Answering HOST/MONITOR with real stream for monitoring', {
                hasLocalStream: !!stream,
                streamActive: stream?.active,
                hasVideo: stream?.getVideoTracks().length > 0,
                hasAudio: stream?.getAudioTracks().length > 0
              });
              // Ensure we send the actual stream, not empty
              const monitoringStream = stream && stream.active ? stream : new MediaStream();
              answerCall(call, monitoringStream);
            } else {
              // Answer other participants with empty stream (they shouldn't see each other)
              console.log('🔒 [PARTICIPANT] Answering participant with empty stream');
              const emptyStream = new MediaStream();
              answerCall(call, emptyStream);
            }
          } else {
            // HOST/MONITOR receiving call from participant
            console.log('🔒 [HOST/MONITOR] Receiving call from PARTICIPANT - answering to establish monitoring');
            // Host answers with empty stream (participants don't need to see host)
            answerCall(call, new MediaStream());
          }
        }
        // Normal meeting: Always answer with our actual stream (tracks may be disabled but exist for negotiation)
        else {
          // Use actual stream with tracks for proper WebRTC negotiation
          // Even if tracks are disabled, they enable bidirectional communication
          console.log('📞 Answering with actual stream (tracks may be disabled)');
          answerCall(call, stream || new MediaStream());
        }
      });
      
      // Function to answer a call
      const answerCall = (call, localStream) => {
        try {
          const callType = call.metadata?.type || 'video';
          
          if (callType === 'screen') {
            // For screen share, don't answer with our stream, just receive
            call.answer(new MediaStream());
            activeCallsRef.current.set(`screen-${call.peer}`, call);
            console.log('✅ Answered screen share call from:', call.metadata?.userName || call.peer);
            
            call.on('stream', (remoteStream) => {
              console.log('🖥️ Received screen share stream from:', call.peer);
              console.log('🖥️ Stream tracks:', {
                video: remoteStream.getVideoTracks().length,
                audio: remoteStream.getAudioTracks().length,
                active: remoteStream.active
              });
              
              // Add to screen shares map
              setScreenShares(prev => {
                const newScreenShares = new Map(prev);
                newScreenShares.set(call.peer, {
                  stream: remoteStream,
                  userName: call.metadata?.userName || 'Unknown'
                });
                console.log('🖥️ Screen shares count:', newScreenShares.size);
                return newScreenShares;
              });
              
              // Auto-pin the screen share
              setPinnedParticipant(`screen-${call.peer}`);
            });
            
            call.on('close', () => {
              console.log('🖥️ Screen share call closed:', call.peer);
              activeCallsRef.current.delete(`screen-${call.peer}`);
              setScreenShares(prev => {
                const newScreenShares = new Map(prev);
                newScreenShares.delete(call.peer);
                return newScreenShares;
              });
              // Unpin if this screen was pinned
              setPinnedParticipant(prev => prev === `screen-${call.peer}` ? null : prev);
            });
            
            call.on('error', (err) => {
              console.error('❌ Screen share call error:', err);
              activeCallsRef.current.delete(`screen-${call.peer}`);
            });
          } else {
            // Regular video/audio call
            call.answer(localStream);
            activeCallsRef.current.set(call.peer, call);
            console.log('✅ Answered call from:', call.metadata?.userName || call.peer);
            console.log('✅ Local stream has', localStream.getVideoTracks().length, 'video,', localStream.getAudioTracks().length, 'audio tracks');
            
            // Only add peer with empty stream immediately in proctored mode where we intentionally use empty streams
            // In normal mode, streams should have tracks (even if disabled), so stream event will fire
            const hasLocalTracks = localStream.getVideoTracks().length > 0 || localStream.getAudioTracks().length > 0;
            if (!hasLocalTracks && isProctoredMode) {
              console.log('🔄 [PROCTORED] Answering with empty stream, immediately adding peer');
              setTimeout(() => {
                addPeer(call.peer, new MediaStream(), call.metadata?.userName || 'Unknown', call.metadata?.profilePicUrl || '', call.metadata?.isHost || false, call.metadata?.userId);
              }, 500);
            }
            
            call.on('stream', (remoteStream) => {
              console.log('📹 Received stream from incoming call:', call.peer);
              console.log('📹 Stream details:', {
                id: remoteStream.id,
                active: remoteStream.active,
                video: remoteStream.getVideoTracks().length,
                audio: remoteStream.getAudioTracks().length
              });
              
              // Log video track details
              const videoTrack = remoteStream.getVideoTracks()[0];
              if (videoTrack) {
                console.log('📹 Video track details:', {
                  id: videoTrack.id,
                  enabled: videoTrack.enabled,
                  muted: videoTrack.muted,
                  readyState: videoTrack.readyState,
                  label: videoTrack.label
                });
              } else {
                console.log('⚠️ No video track in incoming stream');
              }
              
              console.log('🎯 Adding peer from incoming call - Name:', call.metadata?.userName, 'isHost:', call.metadata?.isHost);
              console.log('🎯 Stream has video tracks:', remoteStream.getVideoTracks().length, 'audio tracks:', remoteStream.getAudioTracks().length);
              
              // Log role-based info for proctored mode
              if (isProctoredMode) {
                if (isHost) {
                  console.log('🎯 [HOST] Received stream from incoming call from PARTICIPANT');
                } else {
                  const callerIsHost = call.metadata?.isHost || false;
                  if (callerIsHost) {
                    console.log('🎯 [PARTICIPANT] Received stream from incoming call from HOST');
                  } else {
                    console.log('🎯 [PARTICIPANT] Received stream from incoming call from PARTICIPANT');
                  }
                }
              }
              
              addPeer(call.peer, remoteStream, call.metadata?.userName || 'Unknown', call.metadata?.profilePicUrl || '', call.metadata?.isHost || false, call.metadata?.userId);
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
          }
        } catch (error) {
          console.error('❌ Error answering call:', error);
        }
      };

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

  const addPeer = (peerJsId, stream, userName, profilePicUrl = '', peerIsHost = false, actualUserId = null) => {
    // Prevent adding ourselves as a peer - use multiple checks
    if (peerRef.current && peerJsId === peerRef.current.id) {
      console.warn('[⚠️] Attempted to add local user as peer (peerRef check) - skipping');
      return;
    }
    
    // Validate that we have a valid userName
    if (!userName || userName.trim() === '') {
      console.warn('[⚠️] Peer has no userName:', peerJsId);
      userName = 'Unknown User';
    }
    
    // Use actualUserId if provided, otherwise fall back to peerJsId
    const userIdForTracking = actualUserId || peerJsId;
    
    console.log('[➕ ADD PEER] Starting to add peer:', {
      peerJsId: peerJsId.slice(0, 16) + '...',
      actualUserId: actualUserId?.slice(0, 16) + '...',
      userName: userName,
      myPeerId: peerRef.current?.id?.slice(0, 16) + '...',
      hasProfilePic: !!profilePicUrl,
      isHost: peerIsHost,
      streamId: stream?.id,
      streamActive: stream?.active,
      videoTracks: stream?.getVideoTracks().length,
      audioTracks: stream?.getAudioTracks().length
    });
    
    // Remove OLD peer connections for the SAME USER (different PeerJS ID)
    // This fixes duplicate participants on rejoin
    setPeers(prevPeers => {
      const newPeers = new Map(prevPeers);
      
      // Remove any peers with same actualUserId but different peerJsId
      if (actualUserId) {
        const oldPeerEntries = Array.from(newPeers.entries());
        for (const [oldPeerJsId, peerData] of oldPeerEntries) {
          if (peerData.actualUserId === actualUserId && oldPeerJsId !== peerJsId) {
            console.log('[🗑️] Removing OLD peer connection for same user:', peerData.userName, 'oldPeerId:', oldPeerJsId.slice(0, 8), 'newPeerId:', peerJsId.slice(0, 8));
            // Close old call if exists
            const oldCall = activeCallsRef.current.get(oldPeerJsId);
            if (oldCall) {
              try {
                oldCall.close();
              } catch (err) {
                console.warn('⚠️ Error closing old call:', err);
              }
              activeCallsRef.current.delete(oldPeerJsId);
            }
            // Stop old stream tracks
            if (peerData.stream) {
              peerData.stream.getTracks().forEach(track => track.stop());
            }
            newPeers.delete(oldPeerJsId);
          }
        }
      }
      
      // Also remove exact peerJsId match (in case of re-add)
      if (newPeers.has(peerJsId)) {
        console.log('[🔄] Removing duplicate peer (same peerJsId) before re-adding:', userName);
        newPeers.delete(peerJsId);
      }
      
      return newPeers;
    });
    
    console.log('[+] Adding peer:', userName, 'peerJsId:', peerJsId, 'actualUserId:', userIdForTracking, 'profilePic:', !!profilePicUrl, 'isHost:', peerIsHost);
    console.log('[+] Stream details:', {
      active: stream.active,
      id: stream.id,
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length
    });
    
    // Check if peer has audio track and if it's enabled
    const audioTrack = stream.getAudioTracks()[0];
    const isMicOn = audioTrack ? audioTrack.enabled : false;
    
    setPeers(prevPeers => {
      const newPeers = new Map(prevPeers);
      newPeers.set(peerJsId, { stream, userName, profilePicUrl, isMicOn, isHost: peerIsHost, actualUserId: userIdForTracking });
      console.log('[✅ PEERS UPDATED] Total peers count:', newPeers.size);
      console.log('[✅ PEERS UPDATED] Peer list:', Array.from(newPeers.keys()).map(id => {
        const peer = newPeers.get(id);
        return `${peer.userName} (PeerId: ${id.slice(0, 8)}..., UserId: ${peer.actualUserId?.slice(0, 8)}...)`;
      }).join(', '));
      return newPeers;
    });
    
    // Update participants list - deduplicate by actualUserId
    setParticipants(prev => {
      // Remove any existing participant with same actualUserId
      const filtered = prev.filter(p => p.actualUserId !== userIdForTracking);
      // Add new participant
      return [...filtered, { userId: peerJsId, actualUserId: userIdForTracking, userName, userEmail: '', profilePicUrl, isMicOn, isHost: peerIsHost }];
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

  // Re-establish peer connections with new stream
  const reestablishPeerConnections = (newStream) => {
    if (!peerRef.current || !newStream) {
      console.warn('⚠️ Cannot reestablish - peer or stream not available');
      return;
    }
    
    console.log('🔄 Re-establishing peer connections with new stream...');
    console.log('🔄 Current active calls:', activeCallsRef.current.size);
    console.log('🔄 Current peers:', peers.size);
    
    // Close all existing calls
    activeCallsRef.current.forEach((call, peerId) => {
      try {
        console.log('🔌 Closing old connection to:', peerId);
        call.close();
      } catch (err) {
        console.warn('⚠️ Error closing call:', err);
      }
    });
    activeCallsRef.current.clear();
    
    // In proctored mode (non-host), use empty stream
    const streamToSend = (isProctoredMode && isHost) ? new MediaStream() : (isProctoredMode && !isHost ? newStream : newStream);
    if (isProctoredMode && isHost) {
      console.log('🔒 Proctored mode: HOST sending empty stream (one-way monitoring)');
    }
    
    // Call all peers with the stream
    peers.forEach((peerData, peerId) => {
      try {
        console.log('📞 Calling peer with new stream:', peerData.userName, 'peerId:', peerId);
        
        const call = peerRef.current.call(peerId, streamToSend, {
          metadata: { 
            userName, 
            userEmail, 
            profilePicUrl: encodeURIComponent(userProfilePic || ''),
            userId: currentUser?.uid || userEmail
          },
          sdpTransform: (sdp) => {
            // Increase bandwidth for 1080p60
            return sdp.replace(/b=AS:(\\d+)/g, 'b=AS:5000')
                      .replace(/b=TIAS:(\\d+)/g, 'b=TIAS:5000000');
          }
        });
        
        if (call) {
          activeCallsRef.current.set(peerId, call);
          console.log('✅ Re-established call to:', peerData.userName);
          
          call.on('stream', (remoteStream) => {
            console.log('📹 Received stream (reestablished) from:', peerData.userName);
            // Update peer data with stream (it might have changed)
            setPeers(prev => {
              const updated = new Map(prev);
              const existing = updated.get(peerId);
              if (existing) {
                updated.set(peerId, { ...existing, stream: remoteStream });
              }
              return updated;
            });
          });
          
          call.on('close', () => {
            console.log('📞 Reestablished call closed:', peerId);
            activeCallsRef.current.delete(peerId);
          });
          
          call.on('error', (err) => {
            console.error('❌ Reestablished call error:', err);
            activeCallsRef.current.delete(peerId);
          });
        }
      } catch (err) {
        console.error('❌ Error calling peer with new stream:', err);
      }
    });
    
    console.log('✅ Peer connections re-established');
  };

  const toggleMic = async () => {
    console.log('🎤 Toggle mic clicked, current state:', isMicOn);
    console.log('🎤 Local stream available:', !!localStream);
    
    // If no stream exists and user wants to turn mic on, request permission
    if (!localStream && !isMicOn) {
      console.log('🎤 No stream available, requesting microphone permission...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
        
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        setIsMicOn(true);
        console.log('✅ Microphone access granted and enabled');
        
        // Re-establish peer connections with the new stream
        reestablishPeerConnections(stream);
        return;
      } catch (error) {
        console.error('❌ Microphone permission denied:', error);
        setError('Microphone access denied. Please allow microphone permission in your browser settings.');
        return;
      }
    }
    
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      console.log('🎤 Audio tracks found:', audioTracks.length);
      
      // If no audio track exists but user wants to turn mic on
      if (audioTracks.length === 0 && !isMicOn) {
        console.log('🎤 No audio track, requesting permission...');
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          
          // Merge the new audio track with existing video tracks
          const newStream = new MediaStream([
            ...localStream.getVideoTracks(),
            ...audioStream.getAudioTracks()
          ]);
          
          setLocalStream(newStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = newStream;
          }
          
          setIsMicOn(true);
          console.log('✅ Microphone access granted and enabled');
          
          // Re-establish peer connections with the new merged stream
          reestablishPeerConnections(newStream);
          return;
        } catch (error) {
          console.error('❌ Microphone permission denied:', error);
          setError('Microphone access denied. Please allow microphone permission in your browser settings.');
          return;
        }
      }
      
      const audioTrack = audioTracks[0];
      if (audioTrack) {
        console.log('🎤 Audio track before toggle - enabled:', audioTrack.enabled, 'readyState:', audioTrack.readyState);
        const newState = !isMicOn;
        audioTrack.enabled = newState;
        setIsMicOn(newState);
        console.log('🎤 Microphone toggled to:', newState, 'track enabled:', audioTrack.enabled);
        
        // Broadcast mic state to other participants via API
        const broadcastMicState = async () => {
          try {
            await fetch('/api/socket', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                roomId,
                type: 'media-state',
                userId: peerRef.current?.id,
                userName,
                mediaType: 'audio',
                enabled: newState
              })
            });
          } catch (err) {
            console.error('❌ Error broadcasting mic state:', err);
          }
        };
        broadcastMicState();
        
        // Also notify via Socket.IO if available
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

  const toggleCamera = async () => {
    console.log('📹 Toggle camera clicked, current state:', isCameraOn);
    console.log('📹 Local stream available:', !!localStream);
    
    // If no stream exists and user wants to turn camera on, request permission
    if (!localStream && !isCameraOn) {
      console.log('📹 No stream available, requesting camera permission...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 60, max: 60 },
            facingMode: 'user'
          },
          audio: false
        });
        
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        setIsCameraOn(true);
        console.log('✅ Camera access granted and enabled');
        
        // Re-establish peer connections with the new stream
        reestablishPeerConnections(stream);
        return;
      } catch (error) {
        console.error('❌ Camera permission denied:', error);
        setError('Camera access denied. Please allow camera permission in your browser settings.');
        return;
      }
    }
    
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      console.log('📹 Video tracks found:', videoTracks.length);
      
      // If no video track exists but user wants to turn camera on
      if (videoTracks.length === 0 && !isCameraOn) {
        console.log('📹 No video track, requesting permission...');
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              width: { ideal: 1920, max: 1920 },
              height: { ideal: 1080, max: 1080 },
              frameRate: { ideal: 60, max: 60 },
              facingMode: 'user'
            }
          });
          
          // Merge the new video track with existing audio tracks
          const newStream = new MediaStream([
            ...localStream.getAudioTracks(),
            ...videoStream.getVideoTracks()
          ]);
          
          setLocalStream(newStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = newStream;
          }
          
          setIsCameraOn(true);
          console.log('✅ Camera access granted and enabled');
          
          // Re-establish peer connections with the new merged stream
          reestablishPeerConnections(newStream);
          return;
        } catch (error) {
          console.error('❌ Camera permission denied:', error);
          setError('Camera access denied. Please allow camera permission in your browser settings.');
          return;
        }
      }
      
      const videoTrack = videoTracks[0];
      if (videoTrack) {
        console.log('📹 Video track before toggle - enabled:', videoTrack.enabled, 'readyState:', videoTrack.readyState);
        const newState = !isCameraOn;
        videoTrack.enabled = newState;
        setIsCameraOn(newState);
        console.log('📹 Camera toggled to:', newState, 'track enabled:', videoTrack.enabled);
        
        // Broadcast camera state to other participants via API
        const broadcastCameraState = async () => {
          try {
            await fetch('/api/socket', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                roomId,
                type: 'media-state',
                userId: peerRef.current?.id,
                userName,
                mediaType: 'video',
                enabled: newState
              })
            });
          } catch (err) {
            console.error('❌ Error broadcasting camera state:', err);
          }
        };
        broadcastCameraState();
        
        // Also notify via Socket.IO if available
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
        console.log('🖥️ Starting screen share...');
        // Start screen sharing
        const screenMediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: false
        });
        
        console.log('🖥️ Screen stream obtained:', screenMediaStream.id);
        setScreenStream(screenMediaStream);
        setIsScreenSharing(true);
        
        // Handle when user stops sharing via browser UI
        screenMediaStream.getVideoTracks()[0].onended = () => {
          console.log('🖥️ Screen share ended by user');
          stopScreenShare();
        };
        
        // Share screen to all existing peers
        console.log('🖥️ Sharing screen to', peers.size, 'peers');
        peers.forEach((peerData, peerId) => {
          try {
            console.log('🖥️ Calling peer', peerId, 'with screen share');
            const call = peerRef.current.call(peerId, screenMediaStream, {
              metadata: {
                userName,
                userEmail,
                userId: currentUser?.uid || userEmail,
                profilePicUrl: encodeURIComponent(userProfilePic || ''),
                type: 'screen' // Mark as screen share
              }
            });
            
            if (call) {
              activeCallsRef.current.set(`screen-${peerId}`, call);
              console.log('🖥️ Screen share call initiated to peer:', peerId);
            }
          } catch (err) {
            console.error('🖥️ Error calling peer with screen:', peerId, err);
          }
        });
        
      } else {
        stopScreenShare();
      }
    } catch (error) {
      console.error('❌ Error toggling screen share:', error);
      if (error.name === 'NotAllowedError') {
        alert('Screen sharing permission denied. Please allow screen sharing and try again.');
      }
    }
  };

  const stopScreenShare = () => {
    console.log('🖥️ Stopping screen share');
    
    if (screenStream) {
      screenStream.getTracks().forEach(track => {
        track.stop();
        console.log('🖥️ Stopped screen track:', track.kind);
      });
      setScreenStream(null);
    }
    
    // Close all screen share calls
    activeCallsRef.current.forEach((call, key) => {
      if (key.startsWith('screen-')) {
        call.close();
        activeCallsRef.current.delete(key);
        console.log('🖥️ Closed screen share call:', key);
      }
    });
    
    setIsScreenSharing(false);
    console.log('🖥️ Screen sharing stopped');
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
    
    setNewMessage('');
    setReplyTo(null);
    
    // Send to Firebase - real-time listener will update UI
    try {
      await sendChatMessage(roomId, message);
      console.log('💬 [FIREBASE] Message sent successfully');
    } catch (error) {
      console.error('❌ [FIREBASE] Failed to send message:', error);
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
    
    setNewPoll({ question: '', options: ['', ''] });
    setShowCreatePoll(false);
    
    // Send to Firebase - real-time listener will update UI
    try {
      await createPollInMeeting(roomId, poll);
      console.log('📊 [FIREBASE] Poll created successfully');
    } catch (error) {
      console.error('❌ [FIREBASE] Failed to create poll:', error);
    }
  };

  const votePoll = async (pollId, optionId) => {
    const previousVote = pollVotes[pollId];
    
    // Update local vote tracking immediately for UI feedback
    setPollVotes(prev => ({ ...prev, [pollId]: optionId }));
    
    // Find the poll's firestoreId from the polls state
    const poll = polls.find(p => p.id === pollId);
    if (!poll || !poll.firestoreId) {
      console.error('❌ [FIREBASE] Poll not found or missing firestoreId');
      return;
    }
    
    // Send vote to Firebase - real-time listener will update poll data
    try {
      await votePollInMeeting(roomId, poll.firestoreId, optionId, userName, previousVote);
      console.log('📊 [FIREBASE] Vote submitted successfully');
    } catch (error) {
      console.error('❌ [FIREBASE] Failed to vote:', error);
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

  // Delete message function
  const deleteMessage = async (messageId) => {
    // Find the message's firestoreId from the messages state
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.firestoreId) {
      console.error('❌ [FIREBASE] Message not found or missing firestoreId');
      return;
    }
    
    // Delete from Firebase - real-time listener will update UI
    try {
      await deleteChatMessage(roomId, message.firestoreId);
      console.log('🗑️ [FIREBASE] Message deleted successfully');
    } catch (error) {
      console.error('❌ [FIREBASE] Failed to delete message:', error);
    }
  };

  // Delete poll function
  const deletePoll = async (pollId) => {
    // Find the poll's firestoreId from the polls state
    const poll = polls.find(p => p.id === pollId);
    if (!poll || !poll.firestoreId) {
      console.error('❌ [FIREBASE] Poll not found or missing firestoreId');
      return;
    }
    
    // Remove any votes for this poll
    setPollVotes(prev => {
      const updated = { ...prev };
      delete updated[pollId];
      return updated;
    });
    
    // Delete from Firebase - real-time listener will update UI
    try {
      await deletePollFromMeeting(roomId, poll.firestoreId);
      console.log('🗑️ [FIREBASE] Poll deleted successfully');
    } catch (error) {
      console.error('❌ [FIREBASE] Failed to delete poll:', error);
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

  // Listen for captions from all participants via Firebase
  useEffect(() => {
    if (!roomId || !showCaptions) return;

    console.log('🔥 [FIREBASE] Setting up real-time caption listener');
    
    const captionsRef = collection(db, 'meetings', roomId, 'captions');
    const captionsQuery = query(
      captionsRef,
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(captionsQuery, (snapshot) => {
      const receivedCaptions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })).reverse(); // Oldest first

      console.log('📝 [FIREBASE] Received captions:', receivedCaptions.length);
      
      // Only update if we received captions
      if (receivedCaptions.length > 0) {
        setCaptions(prev => {
          // Merge with local interim captions
          const interimOnly = prev.filter(c => !c.isFinal);
          const allCaptions = [...receivedCaptions, ...interimOnly];
          return allCaptions.slice(-10); // Keep last 10
        });
      }
    }, (error) => {
      console.error('❌ [FIREBASE] Caption listener error:', error);
    });

    return () => {
      console.log('🔥 [FIREBASE] Cleaning up caption listener');
      unsubscribe();
    };
  }, [roomId, showCaptions]);

  // Live Caption Speech Recognition
  useEffect(() => {
    if (!showCaptions) return;

    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('⚠️ Speech recognition not supported in this browser');
      setCaptions([{
        id: 'error',
        text: 'Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.',
        timestamp: new Date(),
        isFinal: true,
        isError: true
      }]);
      return;
    }

    // Check for HTTPS (required for speech recognition in production)
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      console.warn('⚠️ Speech recognition requires HTTPS');
      setCaptions([{
        id: 'error',
        text: 'Live captions require a secure connection (HTTPS). Please access this site via HTTPS.',
        timestamp: new Date(),
        isFinal: true,
        isError: true
      }]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3; // Get more alternatives for better accuracy

    recognition.onstart = () => {
      setIsListening(true);
      retryCountRef.current = 0; // Reset retry count on successful start
      console.log('🎤 Speech recognition started');
      console.log('✅ Recognition state: ACTIVE');
      console.log('📱 ShowCaptions:', showCaptions);
      
      // Clear error messages
      setCaptions(prev => {
        console.log('📋 Current captions:', prev.length);
        return prev.filter(c => !c.isError);
      });
    };
    
    recognition.onaudiostart = () => {
      console.log('🎵 Audio capturing STARTED - Microphone is active!');
    };
    
    recognition.onaudioend = () => {
      console.log('🎵 Audio capturing ended');
    };
    
    recognition.onspeechstart = () => {
      console.log('🗣️ SPEECH DETECTED! Processing...');
    };
    
    recognition.onspeechend = () => {
      console.log('🤐 Speech ended - Waiting for more...');
    };
    
    recognition.onnomatch = (event) => {
      console.warn('⚠️ No speech match found - speech was not recognized');
      console.log('📊 No match event:', event);
      setCaptions(prev => [
        ...prev,
        {
          id: Date.now(),
          text: '[Speech detected but could not be recognized. Try speaking more clearly.]',
          timestamp: new Date(),
          isFinal: false,
          isError: false
        }
      ]);
    };

    recognition.onresult = (event) => {
      console.log('✨ Recognition result received!', {
        resultsLength: event.results.length,
        resultIndex: event.resultIndex
      });
      
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        console.log(`📝 Result ${i}:`, {
          transcript,
          confidence,
          isFinal: event.results[i].isFinal
        });
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      console.log('📊 Transcripts:', {
        final: finalTranscript,
        interim: interimTranscript
      });

      if (finalTranscript) {
        const newCaption = {
          id: Date.now(),
          text: finalTranscript.trim(),
          timestamp: new Date(),
          isFinal: true,
          speaker: userEmail || 'Unknown',
          speakerName: userName || 'Guest'
        };
        
        console.log('➕ Adding final caption:', newCaption);
        
        // Send to Firebase to share with all participants
        if (roomId) {
          try {
            addDoc(collection(db, 'meetings', roomId, 'captions'), {
              ...newCaption,
              timestamp: serverTimestamp()
            }).then(() => {
              console.log('📤 Caption sent to Firebase');
            }).catch(err => {
              console.error('Failed to send caption to Firebase:', err);
            });
          } catch (error) {
            console.error('Error sending caption:', error);
          }
        }
        
        setCaptions(prev => {
          const withoutInterim = prev.filter(c => c.isFinal && !c.isError);
          const updated = [...withoutInterim, newCaption];
          console.log('📋 Updated captions:', updated);
          // Keep only last 10 captions
          return updated.slice(-10);
        });

        // Update last result time for watchdog
        lastResultTimeRef.current = Date.now();
        console.log('⏰ Updated last result time - watchdog reset');

        // Reset watchdog timer - restart if no results for 3 seconds
        if (watchdogTimerRef.current) {
          clearTimeout(watchdogTimerRef.current);
        }
        watchdogTimerRef.current = setTimeout(() => {
          console.log('⚠️ No results for 3 seconds - restarting recognition...');
          try {
            if (recognitionRef.current && showCaptions) {
              recognitionRef.current.stop();
              setTimeout(() => {
                if (recognitionRef.current && showCaptions) {
                  console.log('🔄 Watchdog restart initiated');
                  recognitionRef.current.start();
                }
              }, 100);
            }
          } catch (error) {
            console.error('Watchdog restart error:', error);
          }
        }, 3000);
      } else if (interimTranscript) {
        // Update interim caption
        const interimCaption = {
          id: 'interim',
          text: interimTranscript.trim(),
          timestamp: new Date(),
          isFinal: false
        };
        
        console.log('💭 Adding interim caption:', interimCaption);
        
        setCaptions(prev => {
          const withoutInterim = prev.filter(c => (c.isFinal && !c.isError));
          const updated = [...withoutInterim, interimCaption];
          console.log('📋 Updated captions with interim:', updated);
          return updated;
        });
      }
    };

    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);
      console.log('📊 Error details:', {
        error: event.error,
        message: event.message,
        type: event.type,
        retryCount: retryCountRef.current,
        maxRetries: 3,
        isOnline: navigator.onLine,
        protocol: window.location.protocol
      });
      setIsListening(false);

      // Handle different error types
      switch (event.error) {
        case 'network':
          console.log('🌐 Network error detected. Auto-retry will attempt in a moment...');
          setCaptions([{
            id: 'network-error',
            text: 'Network error. Please check your internet connection and try again.',
            timestamp: new Date(),
            isFinal: true,
            isError: true
          }]);
          
          // Log troubleshooting info
          console.log('💡 Troubleshooting tips:');
          console.log('  - Check if you have stable internet connection');
          console.log('  - This feature requires HTTPS in production');
          console.log('  - Chrome/Edge speech API may have service interruptions');
          console.log('  - Try refreshing the page if error persists');
          
          // Retry with exponential backoff
          if (retryCountRef.current < 3 && showCaptions) {
            const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
            console.log(`🔄 Retrying in ${delay}ms... (Attempt ${retryCountRef.current + 1}/3)`);
            retryCountRef.current++;
            
            retryTimeoutRef.current = setTimeout(() => {
              if (showCaptions && recognitionRef.current) {
                try {
                  // Stop first to ensure clean restart
                  try {
                    recognitionRef.current.stop();
                  } catch (stopError) {
                    // Ignore if already stopped
                  }
                  
                  // Wait a bit before starting again
                  setTimeout(() => {
                    if (showCaptions && recognitionRef.current) {
                      try {
                        recognitionRef.current.start();
                      } catch (startError) {
                        console.log('Could not restart recognition:', startError.message);
                      }
                    }
                  }, 200);
                } catch (e) {
                  console.log('Could not restart recognition:', e.message);
                }
              }
            }, delay);
          } else {
            setCaptions(prev => [...prev.filter(c => !c.isError), {
              id: 'retry-failed',
              text: 'Unable to connect to speech service. Please try again later.',
              timestamp: new Date(),
              isFinal: true,
              isError: true
            }]);
          }
          break;

        case 'not-allowed':
        case 'service-not-allowed':
          setCaptions([{
            id: 'permission-error',
            text: 'Microphone access denied. Please allow microphone permissions and try again.',
            timestamp: new Date(),
            isFinal: true,
            isError: true
          }]);
          break;

        case 'no-speech':
          // Just restart, don't show error
          console.warn('⚠️ No-speech error detected - will auto-restart');
          console.log('💡 This usually means speech was detected but no words were recognized');
          
          if (showCaptions && recognitionRef.current) {
            setTimeout(() => {
              try {
                // Stop first to ensure clean restart
                try {
                  recognition.stop();
                } catch (stopError) {
                  // Ignore if already stopped
                }
                
                // Wait before restarting
                setTimeout(() => {
                  if (showCaptions && recognitionRef.current) {
                    try {
                      console.log('🔄 Restarting after no-speech...');
                      recognition.start();
                    } catch (startError) {
                      console.log('Recognition restart failed:', startError.message);
                    }
                  }
                }, 200);
              } catch (e) {
                console.log('Recognition restart failed:', e.message);
              }
            }, 500);
          }
          break;

        case 'aborted':
          // Don't auto-restart on abort
          break;

        default:
          setCaptions([{
            id: 'unknown-error',
            text: `An error occurred: ${event.error}. Please try again.`,
            timestamp: new Date(),
            isFinal: true,
            isError: true
          }]);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('🎤 Speech recognition ended');
      console.log('📊 Recognition end details:', {
        showCaptions,
        retryCount: retryCountRef.current,
        maxRetries: 3,
        hasRecognition: !!recognitionRef.current
      });
      
      // Auto-restart if captions are still enabled
      if (showCaptions) {
        console.log('🔄 Auto-restarting recognition...');
        retryTimeoutRef.current = setTimeout(() => {
          if (showCaptions && recognitionRef.current) {
            try {
              // Ensure it's stopped before restarting
              try {
                recognition.stop();
              } catch (stopError) {
                // Ignore if already stopped
              }
              
              // Wait before starting
              setTimeout(() => {
                if (showCaptions && recognitionRef.current) {
                  try {
                    console.log('➡️ Restarting recognition now...');
                    recognition.start();
                  } catch (startError) {
                    console.log('Recognition restart failed:', startError.message);
                  }
                }
              }, 200);
            } catch (e) {
              console.log('Recognition restart failed:', e.message);
            }
          }
        }, 500);
      } else {
        console.log('⚠️ Not auto-restarting - showCaptions is false');
      }
    };

    recognitionRef.current = recognition;

    // Start recognition with initial delay to ensure proper setup
    setTimeout(() => {
      try {
        if (showCaptions && recognitionRef.current) {
          recognition.start();
        }
      } catch (e) {
        console.error('Failed to start recognition:', e.message);
        setCaptions([{
          id: 'start-error',
          text: 'Failed to start speech recognition. Please try again.',
          timestamp: new Date(),
          isFinal: true,
          isError: true
        }]);
      }
    }, 100);

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Recognition already stopped');
        }
        recognitionRef.current = null;
      }
    };
  }, [showCaptions, roomId, userEmail, userName]);

  const toggleCaptions = () => {
    setShowCaptions(!showCaptions);
    if (showCaptions) {
      // Clear captions when turning off
      setCaptions([]);
      // Clear watchdog timer
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
        console.log('⏹️ Watchdog timer cleared');
      }
    }
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

  const leaveMeeting = async () => {
    console.log('🚪 [VideoRoom] Leaving meeting...');
    console.log('👤 [VideoRoom] Current user:', currentUser?.uid);
    console.log('⏰ [VideoRoom] Meeting joined time:', meetingJoinedTime);
    console.log('📝 [VideoRoom] Meeting title:', meetingTitle);
    console.log('👥 [VideoRoom] Participants:', participants.length + 1);
    
    // Update attempt status if in proctored mode
    if (isProctoredMode && !isHost && currentUser?.email) {
      try {
        await updateAttemptStatus(roomId, currentUser.email, 'completed');
        console.log('✅ Attempt marked as completed');
      } catch (error) {
        console.error('❌ Failed to update attempt status:', error);
      }
    }
    
    // Save meeting to history if user is authenticated
    if (currentUser && meetingJoinedTime) {
      try {
        const meetingEndTime = new Date();
        const participantCount = participants.length + 1; // +1 for current user
        
        const historyData = {
          title: meetingTitle || 'Untitled Meeting',
          startedAt: meetingJoinedTime,
          endedAt: meetingEndTime,
          participantsCount: participantCount
        };
        
        console.log('💾 [VideoRoom] Saving meeting to history:', historyData);
        
        await addMeetingToHistory(currentUser.uid, historyData);
        
        console.log('✅ [VideoRoom] Meeting saved to history successfully');
      } catch (error) {
        console.error('❌ [VideoRoom] Failed to save meeting to history:', error);
        console.error('❌ [VideoRoom] Error details:', error.message);
      }
    } else {
      console.warn('⚠️ [VideoRoom] Not saving meeting - missing user or join time');
      console.warn('⚠️ [VideoRoom] Current user exists:', !!currentUser);
      console.warn('⚠️ [VideoRoom] Join time exists:', !!meetingJoinedTime);
    }
    
    // Clear saved meeting data
    localStorage.removeItem(`meeting-notes-${roomId}`);
    localStorage.removeItem(`meeting-whiteboard-${roomId}`);
    
    cleanup();
    navigate('/');
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up connections...');
    
    // Clean up Firebase chat and polls when leaving meeting
    cleanupMeetingChat(roomId).catch(err => 
      console.error('❌ Failed to cleanup meeting chat:', err)
    );
    
    // Stop screen sharing if active
    if (isScreenSharing) {
      stopScreenShare();
    }
    
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
    
    // Stop all screen share streams
    screenShares.forEach((screenData) => {
      if (screenData.stream) {
        screenData.stream.getTracks().forEach(track => track.stop());
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
        fetch(`/api/peer-discovery/${roomId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: peerRef.current.id })
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
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <X className="w-10 h-10 text-red-500" />
          </div>
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

  // Show pre-join screen before loading the meeting
  if (showPreJoin && !preJoinPreferences) {
    return (
      <PreJoinScreen
        onJoin={(preferences) => {
          setPreJoinPreferences(preferences);
          setShowPreJoin(false);
        }}
        userName={userName}
        meetingTitle={searchParams.get('title') || meetingTitle || `Meeting ${roomId}`}
        isProctoredMode={isProctoredMode}
        isHost={isHost}
        attemptInfo={attemptInfo}
      />
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

      {/* Premium Glassmorphism Header - Fully Responsive */}
      <div className="bg-black/40 backdrop-blur-xl border-b border-white/10 px-2 sm:px-4 lg:px-6 py-2 sm:py-3 shadow-2xl relative overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5"></div>
        
        <div className="flex items-center justify-between relative max-w-screen-2xl mx-auto z-10">
          {/* Left Section - Timer and Clock */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            {/* Meeting Duration with Pulse */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-br from-blue-600/20 to-blue-700/20 backdrop-blur-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-blue-500/30 shadow-lg active:scale-95 sm:hover:shadow-blue-500/20 transition-all duration-300 sm:hover:scale-105">
              <div className="relative">
                <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-white font-mono tracking-wider">{meetingDuration}</span>
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
        
          {/* Right Section - Premium Action Buttons - Responsive */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="group flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2.5 bg-gradient-to-br from-purple-600/20 to-purple-700/20 hover:from-purple-600/30 hover:to-purple-700/30 backdrop-blur-sm rounded-lg sm:rounded-xl transition-all duration-300 border border-purple-500/30 hover:border-purple-500/50 shadow-lg active:scale-95 sm:hover:shadow-purple-500/20 sm:hover:scale-105"
            >
              <Users className="w-5 h-5 sm:w-5 sm:h-5 lg:w-5 lg:h-5 text-purple-300 group-hover:text-purple-200 transition-colors" />
              <div className="flex items-center gap-1">
                <span className="text-xs sm:text-sm lg:text-base font-bold text-white">{participants.length + 1}</span>
                <span className="hidden lg:inline text-xs text-purple-200/80">participants</span>
              </div>
            </button>
          
            <button
              onClick={() => setShowChat(!showChat)}
              className={`group relative flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-300 border shadow-lg active:scale-95 sm:hover:scale-105 ${
                showChat 
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500/50 text-white shadow-blue-500/30' 
                  : 'bg-gradient-to-br from-gray-700/40 to-gray-800/40 hover:from-gray-700/60 hover:to-gray-800/60 backdrop-blur-sm border-white/10 hover:border-white/20'
              }`}
            >
              <MessageSquare className={`w-5 h-5 sm:w-5 sm:h-5 lg:w-5 lg:h-5 transition-colors ${showChat ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} />
              <span className="text-xs sm:text-sm font-semibold hidden md:inline">Chat</span>
              {unreadMessageCount > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 bg-gradient-to-br from-red-500 to-red-600 text-[10px] sm:text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/50 animate-bounce">
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </span>
              )}
            </button>
          
            <button
              onClick={toggleRaiseHand}
              className={`group flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-300 border shadow-lg active:scale-95 sm:hover:scale-105 ${
                isHandRaised 
                  ? 'bg-gradient-to-br from-yellow-500 to-orange-500 border-yellow-400/50 text-white shadow-yellow-500/30 animate-pulse' 
                  : 'bg-gradient-to-br from-gray-700/40 to-gray-800/40 hover:from-gray-700/60 hover:to-gray-800/60 backdrop-blur-sm border-white/10 hover:border-white/20'
              }`}
              title="Raise hand"
            >
              <Hand className={`w-5 h-5 sm:w-5 sm:h-5 lg:w-5 lg:h-5 transition-colors ${isHandRaised ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} />
              <span className="text-xs sm:text-sm font-semibold hidden lg:inline">
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
              ) : pinnedParticipant && pinnedParticipant.startsWith('screen-') ? (
                // Screen share pinned
                (() => {
                  const screenPeerId = pinnedParticipant.replace('screen-', '');
                  const screenShare = screenShares.get(screenPeerId);
                  if (!screenShare) return null;
                  
                  return (
                    <div className="relative w-full max-w-6xl mx-auto">
                      <ScreenShare
                        stream={screenShare.stream}
                        userName={screenShare.userName}
                        peerId={screenPeerId}
                        isPinned={true}
                      />
                      <button
                        onClick={() => setPinnedParticipant(null)}
                        className="absolute top-3 right-3 bg-green-600 hover:bg-green-700 p-2 rounded-lg transition-colors z-10"
                        title="Unpin"
                      >
                        <PinOff className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  );
                })()
              ) : (
                getSortedParticipants().map(([peerId, peerData]) => {
                  if (peerId === pinnedParticipant) {
                    const mediaState = peerMediaStates.get(peerId);
                    const isCameraEnabled = mediaState?.video; // undefined if not yet known, RemoteVideo will check stream
                    const isMicEnabled = mediaState?.audio;
                    return (
                      <RemoteVideo
                        key={peerId}
                        peerId={peerId}
                        stream={peerData.stream}
                        userName={peerData.userName}
                        profilePicUrl={peerData.profilePicUrl}
                        isCameraOn={isCameraEnabled}
                        isMicOn={isMicEnabled}
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
                  const mediaState = peerMediaStates.get(peerId);
                  const isCameraEnabled = mediaState?.video; // undefined if not yet known
                  const isMicEnabled = mediaState?.audio;
                  return (
                    <RemoteVideo
                      key={peerId}
                      peerId={peerId}
                      stream={peerData.stream}
                      userName={peerData.userName}
                      profilePicUrl={peerData.profilePicUrl}
                      isCameraOn={isCameraEnabled}
                      isMicOn={isMicEnabled}
                      handsRaised={handsRaised}
                      isPinned={false}
                      isThumbnail={true}
                      onPin={() => setPinnedParticipant(peerId)}
                    />
                  );
                })}
                {/* Screen Share Thumbnails */}
                {Array.from(screenShares.entries()).map(([peerId, screenData]) => {
                  if (`screen-${peerId}` === pinnedParticipant) return null;
                  return (
                    <div
                      key={`screen-${peerId}`}
                      className="relative bg-black rounded-lg overflow-hidden border-2 border-green-500/50 shadow-lg group cursor-pointer hover:border-green-500 transition-all"
                      onClick={() => setPinnedParticipant(`screen-${peerId}`)}
                    >
                      <video
                        ref={(videoEl) => {
                          if (videoEl && screenData.stream) {
                            // Pause before changing srcObject to prevent interruption
                            if (videoEl.srcObject && videoEl.srcObject !== screenData.stream) {
                              videoEl.pause();
                            }
                            videoEl.srcObject = screenData.stream;
                          }
                        }}
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain bg-black"
                      />
                      <div className="absolute bottom-1.5 left-1.5 bg-green-600/90 backdrop-blur-sm px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Monitor className="w-3 h-3 text-white" />
                        <span className="text-xs font-medium text-white">{screenData.userName}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPinnedParticipant(`screen-${peerId}`);
                        }}
                        className="absolute top-1.5 right-1.5 bg-green-600/80 hover:bg-green-600 backdrop-blur-sm p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Pin screen share"
                      >
                        <Pin className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            // Mobile pagination wrapper for 10+ participants
            isMobileView && totalParticipants > tilesPerPage ? (
              <div 
                className="relative w-full h-full overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Paginated Grid */}
                <div 
                  className="flex h-full transition-transform duration-500 ease-out"
                  style={{ 
                    transform: `translateX(-${currentPage * 100}%)`,
                    width: `${Math.ceil(totalParticipants / tilesPerPage) * 100}%`
                  }}
                >
                  {Array.from({ length: Math.ceil(totalParticipants / tilesPerPage) }).map((_, pageIndex) => {
                    const allParticipants = [
                      { id: 'local', type: 'local', data: null },
                      ...getSortedParticipants().map(([peerId, peerData]) => ({ 
                        id: peerId, 
                        type: 'remote', 
                        data: peerData 
                      }))
                    ];
                    
                    const startIdx = pageIndex * tilesPerPage;
                    const pageParticipants = allParticipants.slice(startIdx, startIdx + tilesPerPage);
                    
                    return (
                      <div key={pageIndex} className={`${gridClass} flex-shrink-0`} style={{ width: '100%' }}>
                        {pageParticipants.map((participant) => {
                          if (participant.type === 'local') {
                            return (
                              <div key="local" className={`relative bg-gray-900 rounded-xl overflow-hidden shadow-xl border-2 group transition-all duration-500 ease-out ${
                                activeSpeaker === 'local' ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-gray-700/40'
                              } ${videoItemClass || ''}`}>
                                <video
                                  ref={localVideoCallbackRef}
                                  autoPlay
                                  muted
                                  playsInline
                                  className={`w-full h-full object-cover bg-black ${!isCameraOn || !localStream ? 'opacity-0' : 'opacity-100'}`}
                                  style={{ transform: 'scaleX(-1)' }}
                                />
                                {(!isCameraOn || !localStream) && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
                                    {userProfilePic ? (
                                      <img src={decodeURIComponent(userProfilePic)} alt={userName} className="w-16 h-16 rounded-full object-cover" />
                                    ) : (
                                      <div className={`w-16 h-16 rounded-full ${getAvatarColor(userName)} flex items-center justify-center`}>
                                        <span className="text-xl font-semibold text-white">{getUserInitials(userName)}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className={`absolute bottom-2 left-2 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-white ${
                                  activeSpeaker === 'local' ? 'bg-blue-600/90' : 'bg-black/70'
                                }`}>
                                  {activeSpeaker === 'local' && '🔊 '}{userName}
                                </div>
                                {!isMicOn && (
                                  <div className="absolute top-2 right-2 bg-red-600 p-1.5 rounded-full">
                                    <MicOff className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                            );
                          } else {
                            const mediaState = peerMediaStates.get(participant.id);
                            const isCameraEnabled = mediaState?.video; // undefined if not yet known
                            const isMicEnabled = mediaState?.audio;
                            const isActiveSpeaker = activeSpeaker === participant.id;
                            return (
                              <RemoteVideo 
                                key={participant.id}
                                peerId={participant.id}
                                stream={participant.data.stream}
                                userName={participant.data.userName}
                                profilePicUrl={participant.data.profilePicUrl}
                                isCameraOn={isCameraEnabled}
                                isMicOn={isMicEnabled}
                                handsRaised={handsRaised}
                                isPinned={false}
                                isThumbnail={false}
                                onPin={() => setPinnedParticipant(participant.id)}
                                isActiveSpeaker={isActiveSpeaker}
                                videoItemClass={videoItemClass}
                                isMobileView={true}
                              />
                            );
                          }
                        })}
                      </div>
                    );
                  })}
                </div>
                
                {/* Page Indicators */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
                  {Array.from({ length: Math.ceil(totalParticipants / tilesPerPage) }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        idx === currentPage ? 'bg-blue-500 w-6' : 'bg-white/40'
                      }`}
                      aria-label={`Go to page ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            ) : (
            <div className={gridClass}>
              {/* Local Video */}
              <div className={`relative bg-gray-900 rounded-2xl overflow-hidden shadow-xl border-2 group hover:border-gray-600/60 transition-all duration-500 ease-out ${
                activeSpeaker === 'local' ? 'border-blue-500 ring-4 ring-blue-500/50 shadow-blue-500/50 shadow-2xl scale-105 z-10' : 'border-gray-700/40'
              } ${videoItemClass || ''} ${singleVideoClass || ''} ${totalParticipants === 2 ? 'w-[48%] aspect-[4/3]' : totalParticipants === 3 ? 'w-[30%] aspect-[4/3]' : totalParticipants === 4 ? 'w-[48%] aspect-[4/3]' : totalParticipants <= 6 ? 'w-[31%] aspect-[4/3]' : 'aspect-video'}`}>
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

              {/* User Info - Clean Badge with Active Speaker Indicator */}
              <div className={`absolute bottom-3 left-3 backdrop-blur-sm px-3 py-1.5 rounded-md flex items-center gap-2 transition-all duration-300 ${
                activeSpeaker === 'local' ? 'bg-blue-600/90 border border-blue-400' : 'bg-black/70'
              }`}>
                {activeSpeaker === 'local' && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-white">Speaking</span>
                    <span className="text-white mx-1">•</span>
                  </div>
                )}
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
              {getSortedParticipants().map(([peerId, peerData]) => {
                const mediaState = peerMediaStates.get(peerId);
                const isCameraEnabled = mediaState?.video; // undefined if not yet known
                const isMicEnabled = mediaState?.audio;
                const isActiveSpeaker = activeSpeaker === peerId;
                return (
                  <RemoteVideo 
                    key={peerId}
                    peerId={peerId}
                    stream={peerData.stream}
                    userName={peerData.userName}
                    profilePicUrl={peerData.profilePicUrl}
                    isCameraOn={isCameraEnabled}
                    isMicOn={isMicEnabled}
                    handsRaised={handsRaised}
                    isPinned={false}
                    isThumbnail={false}
                    onPin={() => setPinnedParticipant(peerId)}
                    isActiveSpeaker={isActiveSpeaker}
                    videoItemClass={videoItemClass}
                    totalParticipants={totalParticipants}
                  />
                );
              })}
              
              {/* Screen Shares in Grid */}
              {Array.from(screenShares.entries()).map(([peerId, screenData]) => (
                <div
                  key={`screen-${peerId}`}
                  className={`${singleVideoClass || ''} ${totalParticipants === 2 ? 'w-[48%] aspect-[4/3]' : totalParticipants === 3 ? 'w-[30%] aspect-[4/3]' : totalParticipants === 4 ? 'w-[48%] aspect-[4/3]' : totalParticipants <= 6 ? 'w-[31%] aspect-[4/3]' : 'aspect-video'}`}
                  onClick={() => setPinnedParticipant(`screen-${peerId}`)}
                >
                  <ScreenShare
                    stream={screenData.stream}
                    userName={screenData.userName}
                    peerId={peerId}
                    isPinned={false}
                  />
                </div>
              ))}
            </div>
            )
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

        {/* Participants Panel */}
        {showParticipants && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowParticipants(false)}>
            <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-white/20 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600/20 to-purple-700/20 border-b border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg">Participants</h3>
                      <p className="text-sm text-purple-200">{participants.length + 1} in meeting</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowParticipants(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400 hover:text-white" />
                  </button>
                </div>
                
                {/* Attempt History Button (Host Only in Proctored Mode) */}
                {isProctoredMode && isHost && (
                  <button
                    onClick={() => {
                      setShowParticipants(false);
                      setShowAttemptHistory(true);
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>View Attempt History</span>
                  </button>
                )}
              </div>
              
              {/* Participants List */}
              <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(80vh-80px)]">
                {/* Local User */}
                <div className="bg-gradient-to-r from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {userProfilePic ? (
                      <img src={userProfilePic} alt={userName} className="w-10 h-10 rounded-full object-cover border-2 border-blue-400" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full ${getAvatarColor(userName)} flex items-center justify-center text-white font-bold border-2 border-blue-400`}>
                        {getUserInitials(userName)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white truncate">{userName}</span>
                        <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full">You</span>
                      </div>
                      <p className="text-xs text-blue-200 truncate">{userEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isMicOn ? (
                      <div className="p-2 bg-green-500/20 rounded-lg" title="Unmuted">
                        <Mic className="w-4 h-4 text-green-400" />
                      </div>
                    ) : (
                      <div className="p-2 bg-red-500/20 rounded-lg" title="Muted">
                        <MicOff className="w-4 h-4 text-red-400" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Remote Participants */}
                {Array.from(peers.entries()).map(([peerId, peerData]) => {
                  // Get media state from our tracked states (updated via API polling)
                  const mediaState = peerMediaStates.get(peerId);
                  const isMicEnabled = mediaState?.audio; // undefined if not yet known, will show as off
                  
                  return (
                    <div key={peerId} className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex items-center justify-between transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full ${getAvatarColor(peerData.userName)} flex items-center justify-center text-white font-bold`}>
                          {getUserInitials(peerData.userName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-white truncate block">{peerData.userName}</span>
                          {handsRaised.has(peerId) && (
                            <span className="text-xs text-yellow-400 flex items-center space-x-1">
                              <Hand className="w-3 h-3" />
                              <span>Hand raised</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isMicEnabled ? (
                          <div className="p-2 bg-green-500/20 rounded-lg" title="Unmuted">
                            <Mic className="w-4 h-4 text-green-400" />
                          </div>
                        ) : (
                          <div className="p-2 bg-red-500/20 rounded-lg" title="Muted">
                            <MicOff className="w-4 h-4 text-red-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {participants.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Waiting for others to join...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Meeting Sidebar */}
        {showChat && (
          <div className="fixed lg:relative top-0 lg:top-0 bottom-0 lg:bottom-0 left-0 right-0 lg:w-96 bg-gray-900/95 backdrop-blur-sm border-l lg:border-l border-t lg:border-t-0 border-white/10 flex flex-col h-full lg:h-[calc(100vh-60px)] z-40 pb-24 sm:pb-28 lg:pb-0">
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
                  { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" />, badge: unreadMessageCount },
                  { id: 'polls', label: 'Polls', icon: <BarChart3 className="w-4 h-4" />, badge: unreadPollCount },
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
                            
                            {/* Action buttons */}
                            <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                              {/* Reply button */}
                              <button
                                onClick={() => setReplyTo(message)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-white/10 transition-all"
                                title="Reply"
                              >
                                <Reply className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-400 hover:text-blue-400" />
                              </button>
                              
                              {/* Delete button - only show for own messages */}
                              {message.userName === userName && (
                                <button
                                  onClick={() => deleteMessage(message.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/20 transition-all"
                                  title="Delete message"
                                >
                                  <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-400 hover:text-red-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Input area - Fixed at bottom */}
                  <div className="p-2 lg:p-4 border-t border-white/10 bg-gray-900 flex-shrink-0 mb-safe">
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
                  
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-0 pb-safe">
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
                          <div key={poll.id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 group">
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-medium text-white text-sm lg:text-base flex-1">{poll.question}</h4>
                              
                              {/* Delete button - only show for poll creator */}
                              {poll.createdBy === userName && (
                                <button
                                  onClick={() => deletePoll(poll.id)}
                                  className="opacity-0 group-hover:opacity-100 ml-2 p-1.5 rounded hover:bg-red-500/20 transition-all flex-shrink-0"
                                  title="Delete poll"
                                >
                                  <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                                </button>
                              )}
                            </div>
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
                  
                  <div className="flex-1 p-4 pb-safe">
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

    {/* Premium Floating Control Bar - Fully Mobile Responsive */}
    <div className="fixed bottom-3 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-2 sm:px-0 w-full sm:w-auto max-w-[95vw] sm:max-w-none">
      <div className="bg-black/70 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl p-2 sm:p-3 lg:p-4 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-center space-x-2 sm:space-x-3 lg:space-x-4">
          <button
            onClick={toggleMic}
            className={`group relative p-3 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 transform active:scale-90 sm:hover:scale-110 shadow-lg ${
              isMicOn 
                ? 'bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600/70 hover:to-slate-700/70 border border-white/20' 
                : 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-500/50 shadow-red-500/50'
            }`}
            title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isMicOn ? <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
            <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none hidden sm:block">
              <div className="bg-black/95 text-white text-sm px-4 py-2 rounded-xl whitespace-nowrap shadow-xl border border-white/10">
                {isMicOn ? 'Mute' : 'Unmute'}
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-black/95 rotate-45 border-r border-b border-white/10"></div>
            </div>
          </button>
          
          <button
            onClick={toggleCamera}
            className={`group relative p-3 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 transform active:scale-90 sm:hover:scale-110 shadow-lg ${
              isCameraOn 
                ? 'bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600/70 hover:to-slate-700/70 border border-white/20' 
                : 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-500/50 shadow-red-500/50'
            }`}
            title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isCameraOn ? <VideoIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <VideoOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
            <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none hidden sm:block">
              <div className="bg-black/95 text-white text-sm px-4 py-2 rounded-xl whitespace-nowrap shadow-xl border border-white/10">
                {isCameraOn ? 'Stop video' : 'Start video'}
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-black/95 rotate-45 border-r border-b border-white/10"></div>
            </div>
          </button>
          
          <button
            onClick={toggleScreenShare}
            className={`group relative p-3 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 transform active:scale-90 sm:hover:scale-110 shadow-lg ${
              isScreenSharing 
                ? 'bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 border border-green-500/50 shadow-green-500/50' 
                : 'bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600/70 hover:to-slate-700/70 border border-white/20'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <Monitor className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
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
              className={`group relative p-3 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 transform active:scale-90 sm:hover:scale-110 shadow-lg bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600/70 hover:to-slate-700/70 border border-white/20 ${
                showReactionsMenu ? 'ring-2 ring-yellow-400/50' : ''
              }`}
              title="Reactions"
            >
              <Smile className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
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
                className="absolute bottom-full mb-2 sm:mb-3 left-1/2 transform -translate-x-1/2 bg-black/95 backdrop-blur-2xl rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-white/20 flex space-x-1.5 sm:space-x-2 shadow-2xl animate-fade-in"
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
                    className="p-2 sm:p-2.5 hover:bg-white/20 rounded-lg sm:rounded-xl transition-all duration-200 transform active:scale-110 sm:hover:scale-125 hover:shadow-lg"
                    title={`React with ${emoji}`}
                  >
                    <span className="text-xl sm:text-2xl">{emoji}</span>
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
              className={`group relative p-3 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 transform active:scale-90 sm:hover:scale-110 shadow-lg bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600/70 hover:to-slate-700/70 border border-white/20 ${
                showToolsMenu ? 'ring-2 ring-blue-400/50' : ''
              }`}
              title="More Tools"
            >
              <MoreVertical className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
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
                className="absolute bottom-full mb-2 sm:mb-3 right-0 bg-black/95 backdrop-blur-2xl rounded-xl sm:rounded-2xl p-1.5 sm:p-2 border border-white/20 min-w-48 sm:min-w-56 shadow-2xl animate-fade-in"
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
                    console.log('📝 Live Caption clicked, current state:', showCaptions);
                    toggleCaptions();
                    setShowToolsMenu(false);
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/10 group ${
                    showCaptions ? 'bg-green-500/10' : ''
                  }`}
                >
                  <div className={`p-2 rounded-lg border transition-colors ${
                    showCaptions 
                      ? 'bg-gradient-to-br from-green-600/30 to-green-700/30 border-green-500/50' 
                      : 'bg-gradient-to-br from-green-600/20 to-green-700/20 border-green-500/30 group-hover:border-green-500/50'
                  }`}>
                    <Subtitles className={`w-5 h-5 text-green-400 ${isListening ? 'animate-pulse' : ''}`} />
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {showCaptions ? 'Hide Captions' : 'Live Captions'}
                  </span>
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

                <button
                  onClick={() => {
                    console.log('💻 Code Space clicked');
                    setShowCodeSpace(true);
                    setShowToolsMenu(false);
                    console.log('💻 Code Space opened');
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/10 group"
                >
                  <div className="p-2 bg-gradient-to-br from-cyan-600/20 to-teal-700/20 rounded-lg border border-cyan-500/30 group-hover:border-cyan-500/50 transition-colors">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">Code Space</span>
                </button>
              </div>
            )}
          </div>
          
          <div className="w-px h-8 sm:h-10 lg:h-12 bg-gradient-to-b from-transparent via-white/30 to-transparent"></div>
          
          <button
            onClick={leaveMeeting}
            className="group relative p-3 sm:p-3.5 lg:p-4 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-xl sm:rounded-2xl transition-all duration-300 transform active:scale-90 sm:hover:scale-110 border border-red-500/50 shadow-lg shadow-red-500/50"
            title="Leave meeting"
          >
            <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-white transform rotate-[135deg]" />
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

      {/* Code Space Modal */}
      <CodeSpace 
        isOpen={showCodeSpace}
        onClose={() => {
          console.log('💻 Code Space onClose called');
          setShowCodeSpace(false);
        }}
      />

      {/* Live Captions */}
      {showCaptions && captions.length > 0 && (
        <div className="fixed bottom-20 sm:bottom-24 left-1/2 transform -translate-x-1/2 z-40 w-11/12 sm:w-auto max-w-4xl">
          <div className="bg-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-3 sm:p-4 md:p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Subtitles className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                <span className="text-white font-semibold text-sm sm:text-base">Live Captions</span>
                {isListening && (
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-xs sm:text-sm">Listening...</span>
                  </div>
                )}
              </div>
              <button
                onClick={toggleCaptions}
                className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-all"
                title="Close captions"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            </div>
            
            <div className="space-y-2 sm:space-y-3 max-h-32 sm:max-h-40 md:max-h-48 overflow-y-auto custom-scrollbar">
              {captions.map((caption) => (
                <div 
                  key={caption.id}
                  className={`text-sm sm:text-base md:text-lg leading-relaxed ${
                    caption.isError 
                      ? 'text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/30' 
                      : caption.isFinal 
                        ? 'text-white opacity-100' 
                        : 'text-white opacity-70 italic'
                  }`}
                >
                  {caption.isError && (
                    <span className="font-semibold block mb-1">⚠️ Error</span>
                  )}
                  {caption.speakerName && caption.isFinal && (
                    <span className="font-semibold text-blue-400 mr-2">{caption.speakerName}:</span>
                  )}
                  {caption.text}
                </div>
              ))}
            </div>

            {/* Show retry button if there's an error */}
            {captions.some(c => c.isError) && (
              <div className="mt-3 sm:mt-4 flex justify-center">
                <button
                  onClick={() => {
                    setCaptions([]);
                    setShowCaptions(false);
                    setTimeout(() => setShowCaptions(true), 300);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all transform hover:scale-105"
                >
                  🔄 Retry
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Attempt History Modal */}
      {showAttemptHistory && (
        <AttemptHistoryModal
          isOpen={showAttemptHistory}
          onClose={() => setShowAttemptHistory(false)}
          meetingId={roomId}
          meetingTitle={meetingTitle || searchParams.get('title') || `Meeting ${roomId}`}
        />
      )}
    </div>
  );
};

const ScreenShare = ({ stream, userName, peerId, isPinned = false }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log('🖥️ Setting screen share stream to video element:', stream.id);
      
      // Pause before changing srcObject to prevent interruption
      if (videoRef.current.srcObject) {
        videoRef.current.pause();
      }
      
      videoRef.current.srcObject = stream;
      
      // Try to play the video
      videoRef.current.play()
        .then(() => console.log('✅ Screen share video playing'))
        .catch(err => {
          // Ignore AbortError during stream changes
          if (err.name !== 'AbortError') {
            console.error('❌ Error playing screen share:', err);
          }
        });
    }
  }, [stream]);

  if (isPinned) {
    return (
      <div className="relative bg-black rounded-xl overflow-hidden shadow-lg border border-green-500/50 group transition-all duration-200 w-full max-w-6xl aspect-video mx-auto">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain bg-black"
        />
        <div className="absolute top-3 left-3 bg-green-600/90 backdrop-blur-sm px-3 py-1.5 rounded-md flex items-center gap-2">
          <Monitor className="w-4 h-4 text-white" />
          <span className="text-sm font-medium text-white">{userName}'s screen</span>
        </div>
        <button
          onClick={() => {}}
          className="absolute top-3 right-3 bg-green-600 hover:bg-green-700 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          title="Unpin"
        >
          <PinOff className="w-4 h-4 text-white" />
        </button>
      </div>
    );
  }

  // Grid view (non-pinned)
  return (
    <div className="relative bg-black rounded-2xl overflow-hidden border-2 border-green-500/50 shadow-xl group hover:border-green-500 transition-all duration-300 ease-in-out aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain bg-black"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-3 left-3 bg-green-600/90 backdrop-blur-sm px-3 py-1.5 rounded-md flex items-center gap-2">
        <Monitor className="w-4 h-4 text-white" />
        <span className="text-sm font-medium text-white truncate max-w-[150px]">{userName}'s screen</span>
      </div>
      <button
        onClick={() => {}}
        className="absolute top-3 right-3 bg-green-600/80 hover:bg-green-600 backdrop-blur-sm p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
        title="Pin screen share"
      >
        <Pin className="w-4 h-4 text-white" />
      </button>
    </div>
  );
};

const RemoteVideo = ({ 
  stream, 
  userName, 
  peerId, 
  profilePicUrl = '', 
  isCameraOn = true,
  isMicOn = true, 
  handsRaised = new Set(), 
  isPinned = false, 
  isThumbnail = false, 
  onPin, 
  pinnedClass = '',
  isActiveSpeaker = false,
  videoItemClass = '',
  totalParticipants = 0,
  isMobileView = false
}) => {
  const videoRef = useRef(null);
  const isHandRaised = handsRaised.has(peerId);
  
  // Determine video/audio status from multiple sources:
  // 1. Props passed from media state polling (isCameraOn, isMicOn)
  // 2. Actual stream track status as fallback
  const videoTrack = stream?.getVideoTracks()[0];
  const audioTrack = stream?.getAudioTracks()[0];
  
  // Check if stream actually has enabled tracks (as fallback/verification)
  const streamHasActiveVideo = videoTrack && videoTrack.enabled && videoTrack.readyState === 'live';
  const streamHasActiveAudio = audioTrack && audioTrack.enabled && audioTrack.readyState === 'live';
  
  // Use polled state if available, otherwise use stream track state
  // Default to showing avatar (false) if we can't determine
  const hasVideo = isCameraOn !== undefined ? isCameraOn : streamHasActiveVideo;
  const hasMic = isMicOn !== undefined ? isMicOn : streamHasActiveAudio;
  
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
      // Pause before changing srcObject to prevent interruption
      if (videoRef.current.srcObject) {
        videoRef.current.pause();
      }
      videoRef.current.srcObject = stream;
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
            {profilePicUrl ? (
              <img src={decodeURIComponent(profilePicUrl)} alt={userName} className="w-14 h-14 rounded-full object-cover shadow-2xl border-2 border-white/20" />
            ) : (
              <div className={`w-14 h-14 rounded-full ${getAvatarColor(userName)} flex items-center justify-center shadow-2xl border-2 border-white/20`}>
                <span className="text-xl font-bold text-white">{getUserInitials(userName)}</span>
              </div>
            )}
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
        {/* Status indicators - use computed hasVideo/hasMic */}
        <div className="absolute top-2 right-10 flex gap-1">
          {!hasVideo && (
            <div className="bg-red-600 p-1.5 rounded-full shadow-lg">
              <VideoOff className="w-3 h-3 text-white" />
            </div>
          )}
          {!hasMic && (
            <div className="bg-red-600 p-1.5 rounded-full shadow-lg">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
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
            {profilePicUrl ? (
              <img src={decodeURIComponent(profilePicUrl)} alt={userName} className="w-40 h-40 rounded-full object-cover shadow-2xl border-4 border-white/20 backdrop-blur-lg" />
            ) : (
              <div className={`w-40 h-40 rounded-full ${getAvatarColor(userName)} flex items-center justify-center shadow-2xl border-4 border-white/20 backdrop-blur-lg`}>
                <span className="text-6xl font-bold text-white drop-shadow-2xl">{getUserInitials(userName)}</span>
              </div>
            )}
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
        
        {/* Media Status Indicators - use computed hasVideo/hasMic */}
        <div className="absolute top-4 right-20 flex gap-2">
          {!hasVideo && (
            <div className="bg-red-600 p-2.5 rounded-full shadow-lg">
              <VideoOff className="w-5 h-5 text-white" />
            </div>
          )}
          {!hasMic && (
            <div className="bg-red-600 p-2.5 rounded-full shadow-lg">
              <MicOff className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-gradient-to-br from-gray-900 to-slate-900 overflow-hidden shadow-xl border group transition-all duration-500 ease-out ${
      isMobileView ? 'rounded-xl' : 'rounded-2xl'
    } ${
      isActiveSpeaker 
        ? `border-2 border-blue-500 ${isMobileView ? 'ring-2' : 'ring-4'} ring-blue-500/50 shadow-blue-500/50 shadow-2xl scale-105 z-10` 
        : 'border border-white/10 hover:border-purple-500/50 hover:shadow-purple-500/20'
    } ${videoItemClass || ''} ${
      isMobileView ? '' : (totalParticipants === 2 ? 'w-[48%] aspect-[4/3]' : totalParticipants === 3 ? 'w-[30%] aspect-[4/3]' : totalParticipants === 4 ? 'w-[48%] aspect-[4/3]' : totalParticipants <= 6 ? 'w-[31%] aspect-[4/3]' : 'aspect-video')
    } ${!isMobileView && 'hover:scale-[1.02]'}`}>
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
          {profilePicUrl ? (
            <img src={decodeURIComponent(profilePicUrl)} alt={userName} className="w-24 h-24 rounded-full object-cover shadow-2xl border-2 border-white/20" />
          ) : (
            <div className={`w-24 h-24 rounded-full ${getAvatarColor(userName)} flex items-center justify-center shadow-2xl border-2 border-white/20`}>
              <span className="text-3xl font-bold text-white drop-shadow-lg">{getUserInitials(userName)}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Premium Gradient Overlay on Hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {/* Hand Raised Indicator with Pulse */}
      {isHandRaised && (
        <div className="absolute top-3 left-3 bg-gradient-to-br from-yellow-400 to-orange-500 p-2.5 rounded-xl shadow-lg animate-pulse border border-yellow-300/50">
          <Hand className="w-5 h-5 text-white drop-shadow-md" />
        </div>
      )}
      
      {/* Premium Name Badge with Active Speaker Indicator - Mobile Optimized */}
      <div className={`absolute backdrop-blur-xl rounded-xl border shadow-lg flex items-center gap-2 transition-all duration-300 ${
        isMobileView ? 'bottom-2 left-2 px-2 py-1 text-xs' : 'bottom-3 left-3 px-4 py-2'
      } ${
        isActiveSpeaker ? 'bg-blue-600/90 border-blue-400' : 'bg-black/80 border-white/20'
      }`}>
        {isActiveSpeaker && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            {!isMobileView && (
              <>
                <span className="text-xs font-bold text-white">Speaking</span>
                <span className="text-white mx-1">•</span>
              </>
            )}
          </div>
        )}
        <span className={`font-bold text-white truncate ${isMobileView ? 'text-xs max-w-[80px]' : 'text-sm max-w-[140px]'}`}>{userName}</span>
      </div>
      
      {/* Status Indicators - Top Right (Dynamic on Hover) */}
      <div className="absolute top-3 right-3 flex gap-1">
        {/* Pin Button */}
        <button
          onClick={onPin}
          className="bg-black/60 hover:bg-blue-500 backdrop-blur-sm p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
          title="Pin participant"
        >
          <Pin className="w-4 h-4 text-white" />
        </button>
        {!hasMic && (
          <div className="bg-red-600 p-1.5 rounded-full">
            <MicOff className="w-4 h-4 text-white" />
          </div>
        )}
        {!hasVideo && (
          <div className="bg-red-600 p-1.5 rounded-full">
            <VideoOff className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoRoom;
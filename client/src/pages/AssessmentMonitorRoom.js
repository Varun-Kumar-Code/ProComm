// src/pages/AssessmentMonitorRoom.js
// Premium Assessment Monitoring Room with Live Video Feeds

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Peer from 'peerjs';
import {
  ArrowLeft,
  Video,
  VideoOff,
  Mic,
  MicOff,
  WifiOff,
  AlertTriangle,
  Users,
  CheckCircle,
  XCircle,
  Shield,
  Lock,
  Unlock,
  LogOut,
  Activity,
  Eye,
  UserX,
  Ban
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getAssessment,
  getAssessmentAttempts,
  subscribeToAttempt
} from '../firebase/assessmentService';

const AssessmentMonitorRoom = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Assessment & Auth state
  const [isLoading, setIsLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [isAssessmentLocked, setIsAssessmentLocked] = useState(false);

  // WebRTC & Peers state
  const [peer, setPeer] = useState(null);
  const [peerId, setPeerId] = useState('');
  const [participants, setParticipants] = useState([]);
  const [connectedPeers, setConnectedPeers] = useState({});
  
  // UI state
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [notification, setNotification] = useState(null);

  const peerConnectionsRef = useRef({});
  const videoRefs = useRef({});
  const pollingIntervalRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const peerRef = useRef(null); // Store peer instance in ref for immediate access

  // Initialize peer connection
  useEffect(() => {
    console.log('🔑 [MONITOR] Assessment ID:', assessmentId);
    
    const initializePeer = () => {
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
        console.log('🎯 [MONITOR] Peer ID:', id);
        setPeerId(id);
        setPeer(newPeer);
        peerRef.current = newPeer; // Store in ref for immediate access
        registerAsMonitor(id, newPeer); // Pass peer instance directly
      });

      newPeer.on('call', (call) => {
        console.log('📞 [MONITOR] Incoming call from:', call.peer, 'metadata:', call.metadata);
        // Accept the call and receive participant stream
        // Monitor answers with empty stream and metadata identifying as monitor
        call.answer(new MediaStream(), {
          metadata: {
            isHost: true,
            isMonitor: true,
            userName: 'Monitor',
            userId: currentUser?.uid
          }
        });
        
        call.on('stream', (remoteStream) => {
          console.log('📹 [MONITOR] Received stream from incoming call:', call.peer);
          console.log('📹 Stream details:', {
            id: remoteStream.id,
            active: remoteStream.active,
            videoTracks: remoteStream.getVideoTracks().length,
            audioTracks: remoteStream.getAudioTracks().length
          });
          addParticipantStream(call.peer, remoteStream);
        });

        call.on('close', () => {
          console.log('📴 [MONITOR] Call closed:', call.peer);
          removeParticipantStream(call.peer);
        });

        call.on('error', (error) => {
          console.error('❌ [MONITOR] Call error:', error);
        });
      });

      newPeer.on('error', (error) => {
        console.error('❌ [MONITOR] Peer error:', error);
        console.error('❌ [MONITOR] Error type:', error.type);
        showNotification('Connection error. Retrying...', 'error');
      });
      
      newPeer.on('disconnected', () => {
        console.warn('⚠️ [MONITOR] Peer disconnected from server - attempting reconnect');
        if (!newPeer.destroyed) {
          newPeer.reconnect();
        }
      });
      
      newPeer.on('close', () => {
        console.warn('⚠️ [MONITOR] Peer connection closed');
      });

      newPeer.on('connection', (conn) => {
        console.log('🔗 [MONITOR] Data connection from:', conn.peer);
        conn.on('data', (data) => {
          handleDataMessage(conn.peer, data);
        });
      });
    };

    initializePeer();

    return () => {
      if (peer) {
        peer.destroy();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register as monitor in peer discovery
  const registerAsMonitor = async (pId, peerInstance) => {
    try {
      const payload = {
        peerId: pId,
        userId: currentUser.uid,
        userName: 'Monitor - ' + (currentUser.displayName || currentUser.email),
        userEmail: currentUser.email,
        isHost: true,
        isMonitor: true
      };
      
      console.log('📤 [MONITOR] Registering with payload:', payload);
      
      const response = await fetch(`/api/peer-discovery/${assessmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [MONITOR] Registered successfully. Response:', data);
        startPeerDiscovery(pId, peerInstance); // Pass peer instance directly
        startHeartbeat(pId);
      } else {
        console.error('❌ [MONITOR] Registration failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ [MONITOR] Registration failed:', error);
    }
  };

  // Discover and connect to participants
  const startPeerDiscovery = (myPeerId, peerInstance) => {
    const discoverPeers = async () => {
      // Use the passed-in peerId or fall back to state
      const currentPeerId = myPeerId || peerId;
      const currentPeer = peerInstance || peerRef.current || peer;
      
      if (!currentPeerId) {
        console.warn('⚠️ [MONITOR] No peer ID available for discovery');
        return;
      }
      
      if (!currentPeer) {
        console.warn('⚠️ [MONITOR] No peer instance available for discovery');
        return;
      }

      try {
        const response = await fetch(`/api/peer-discovery/${assessmentId}`);
        if (!response.ok) {
          console.error('❌ [MONITOR] Discovery failed:', response.status);
          return;
        }

        const data = await response.json();
        console.log('📦 [MONITOR] Raw peer data:', data);
        console.log('🔍 [MONITOR] My Peer ID:', currentPeerId);
        console.log('🔍 [MONITOR] My User ID:', currentUser?.uid);
        console.log('🔍 [MONITOR] All peers:', data.peers);
        
        // Log each peer with details
        data.peers.forEach((p, i) => {
          console.log(`   Peer ${i + 1}:`, {
            peerId: p.peerId,
            userId: p.userId,
            userName: p.userName,
            isMonitor: p.isMonitor,
            isHost: p.isHost
          });
        });
        
        const participantPeers = data.peers.filter(
          (p) => p.peerId !== currentPeerId && !p.isMonitor
        );

        console.log(`👥 [MONITOR] Found ${participantPeers.length} participants after filtering:`, participantPeers);
        
        if (participantPeers.length === 0 && data.peers.length > 0) {
          console.warn('⚠️ [MONITOR] No participants found but peers exist. All peers are either self or monitors:');
          data.peers.forEach(p => {
            console.warn(`     - ${p.userName} (${p.peerId?.slice(0, 8)}...) - isMonitor: ${p.isMonitor}, isSelf: ${p.peerId === currentPeerId}`);
          });
        }

        participantPeers.forEach((peerData) => {
          // Check if we've already called or are calling this peer
          const existingConnection = peerConnectionsRef.current[peerData.peerId];
          const peerState = connectedPeers[peerData.peerId];
          
          if (existingConnection) {
            // Already have a connection/call for this peer
            return;
          }
          
          if (peerState && (peerState.connected || peerState.connecting)) {
            return;
          }
          
          console.log('🔗 [MONITOR] Attempting to connect to new participant:', peerData.userName, `(${peerData.peerId.slice(0, 8)}...)`);
          connectToParticipant(peerData, currentPeer);
        });

        // Update participants list
        setParticipants(participantPeers);
      } catch (error) {
        console.error('❌ [MONITOR] Peer discovery error:', error);
      }
    };

    discoverPeers();
    // Poll every 2 seconds for faster participant discovery
    pollingIntervalRef.current = setInterval(discoverPeers, 2000);
  };

  // Connect to participant and request their stream
  const connectToParticipant = (peerData, peerInstance) => {
    // Use passed instance or fall back to ref
    const currentPeer = peerInstance || peerRef.current || peer;
    
    if (!currentPeer) {
      console.warn('⚠️ [MONITOR] No peer instance available');
      return;
    }
    
    // Check if already have a connection
    if (peerConnectionsRef.current[peerData.peerId]) {
      console.log('ℹ️ [MONITOR] Already have connection to:', peerData.peerId);
      return;
    }

    console.log('🔌 [MONITOR] Connecting to participant:', peerData.peerId);
    console.log('🔌 [MONITOR] Participant details:', peerData);
    console.log('🔌 [MONITOR] Using peer instance:', currentPeer.id);

    try {
      // Mark as connecting FIRST
      setConnectedPeers(prev => ({
        ...prev,
        [peerData.peerId]: {
          ...peerData,
          connecting: true,
          connected: false,
          connectionAttempt: Date.now()
        }
      }));
      
      // Call participant to receive their stream with monitor metadata
      const call = currentPeer.call(peerData.peerId, new MediaStream(), {
        metadata: {
          isHost: true,
          isMonitor: true,
          userName: 'Monitor - ' + (currentUser?.displayName || currentUser?.email || 'Monitor'),
          userId: currentUser?.uid,
          userEmail: currentUser?.email
        }
      });
      
      console.log('📞 [MONITOR] Call initiated to:', peerData.peerId);
      console.log('📞 [MONITOR] Call object:', call ? 'Created' : 'Failed');
      
      if (!call) {
        console.error('❌ [MONITOR] Failed to create call - peer.call returned null');
        setConnectedPeers(prev => ({
          ...prev,
          [peerData.peerId]: {
            ...prev[peerData.peerId],
            connecting: false,
            error: 'Failed to create call'
          }
        }));
        return;
      }

      // Store the call reference IMMEDIATELY to prevent duplicate calls
      peerConnectionsRef.current[peerData.peerId] = { call, timeoutId: null };
      
      // Set up timeout (store ID in ref)
      const connectionTimeoutId = setTimeout(() => {
        console.warn('⚠️ [MONITOR] Connection timeout for:', peerData.peerId);
        // Only clear if we haven't received a stream
        setConnectedPeers(prev => {
          const currentPeer = prev[peerData.peerId];
          if (currentPeer && !currentPeer.connected && currentPeer.connecting) {
            // Clear the connection ref to allow retry
            delete peerConnectionsRef.current[peerData.peerId];
            const updated = { ...prev };
            delete updated[peerData.peerId];
            return updated;
          }
          return prev;
        });
      }, 30000);
      
      peerConnectionsRef.current[peerData.peerId].timeoutId = connectionTimeoutId;

      // Monitor ICE connection state
      if (call.peerConnection) {
        call.peerConnection.oniceconnectionstatechange = () => {
          console.log('🧊 [MONITOR] ICE state for', peerData.peerId, ':', call.peerConnection.iceConnectionState);
        };
        call.peerConnection.onconnectionstatechange = () => {
          console.log('🔗 [MONITOR] Connection state for', peerData.peerId, ':', call.peerConnection.connectionState);
        };
      }

      call.on('stream', (remoteStream) => {
        clearTimeout(connectionTimeoutId);
        console.log('✅ [MONITOR] Received stream from:', peerData.peerId);
        console.log('📹 [MONITOR] Stream info:', {
          id: remoteStream.id,
          active: remoteStream.active,
          videoTracks: remoteStream.getVideoTracks().length,
          audioTracks: remoteStream.getAudioTracks().length,
          videoEnabled: remoteStream.getVideoTracks()[0]?.enabled,
          audioEnabled: remoteStream.getAudioTracks()[0]?.enabled
        });
        
        // Mark as connected when we receive stream
        addParticipantStream(peerData.peerId, remoteStream, peerData);
        showNotification(`Connected to ${peerData.userName || 'participant'}`, 'success');
      });

      call.on('close', () => {
        clearTimeout(connectionTimeoutId);
        console.log('📴 [MONITOR] Call closed:', peerData.peerId);
        removeParticipantStream(peerData.peerId);
      });

      call.on('error', (error) => {
        clearTimeout(connectionTimeoutId);
        console.error('❌ [MONITOR] Call error:', peerData.peerId, error);
        setConnectedPeers(prev => ({
          ...prev,
          [peerData.peerId]: {
            ...prev[peerData.peerId],
            connecting: false,
            connected: false,
            error: error.message || 'Call failed'
          }
        }));
      });

    } catch (error) {
      console.error('❌ [MONITOR] Connection error:', error);
      setConnectedPeers(prev => ({
        ...prev,
        [peerData.peerId]: {
          ...prev[peerData.peerId],
          connecting: false,
          error: error.message
        }
      }));
    }
  };

  // Add participant stream to video element
  const addParticipantStream = (peerId, stream, peerData = null) => {
    console.log('➕ [MONITOR] Adding stream for:', peerId);
    console.log('➕ [MONITOR] Stream details:', {
      id: stream.id,
      active: stream.active,
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
      videoEnabled: stream.getVideoTracks()[0]?.enabled,
      audioEnabled: stream.getAudioTracks()[0]?.enabled
    });
    console.log('➕ [MONITOR] Peer data:', peerData);
    
    setConnectedPeers((prev) => {
      const updated = {
        ...prev,
        [peerId]: {
          ...(prev[peerId] || peerData || {}),
          stream,
          hasVideo: stream.getVideoTracks().length > 0,
          hasAudio: stream.getAudioTracks().length > 0,
          isVideoEnabled: stream.getVideoTracks()[0]?.enabled || false,
          isAudioEnabled: stream.getAudioTracks()[0]?.enabled || false,
          connected: true,
          lastUpdate: Date.now()
        }
      };
      console.log('➕ [MONITOR] Updated connectedPeers:', Object.keys(updated));
      return updated;
    });

    // Attach stream to video element
    setTimeout(() => {
      if (videoRefs.current[peerId]) {
        videoRefs.current[peerId].srcObject = stream;
        videoRefs.current[peerId].play().catch((err) =>
          console.error('Video play error:', err)
        );
      }
    }, 100);
  };

  // Remove participant stream
  const removeParticipantStream = (peerId) => {
    console.log('➖ [MONITOR] Removing stream for:', peerId);
    
    setConnectedPeers((prev) => {
      const updated = { ...prev };
      if (updated[peerId]) {
        updated[peerId].connected = false;
        updated[peerId].stream = null;
      }
      return updated;
    });

    if (videoRefs.current[peerId]) {
      videoRefs.current[peerId].srcObject = null;
    }
  };

  // Heartbeat to keep monitor alive in peer discovery
  const startHeartbeat = (pId) => {
    const sendHeartbeat = async () => {
      try {
        await fetch(`/api/peer-discovery/${assessmentId}`, {
          method: 'GET',
          headers: {
            'X-Peer-ID': pId
          }
        });
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    };

    sendHeartbeat();
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 2000);
  };

  // Handle data messages from participants
  const handleDataMessage = (peerId, data) => {
    console.log('📨 [MONITOR] Data from:', peerId, data);
    
    if (data.type === 'violation') {
      showNotification(
        `${data.userName} - ${data.message}`,
        'warning'
      );
    }
  };

  // Fetch assessment data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const assessmentData = await getAssessment(assessmentId);
        setAssessment(assessmentData);

        if (assessmentData.createdBy !== currentUser.uid) {
          alert('You do not have permission to monitor this assessment');
          navigate('/assessments');
          return;
        }

        const attemptsData = await getAssessmentAttempts(assessmentId);
        setAttempts(attemptsData);

        attemptsData.forEach((attempt) => {
          if (attempt.status === 'in-progress') {
            subscribeToAttempt(attempt.id, (updatedAttempt) => {
              setAttempts((prev) =>
                prev.map((a) => (a.id === updatedAttempt.id ? updatedAttempt : a))
              );
            });
          }
        });
      } catch (error) {
        console.error('Error fetching assessment:', error);
        alert('Failed to load assessment');
        navigate('/assessments');
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser && assessmentId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, currentUser]);

  // Show notification
  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // Control actions
  const handleEndAssessment = () => {
    if (window.confirm('Are you sure you want to end this assessment for all participants?')) {
      // Implementation here
      showNotification('Assessment ended for all participants', 'success');
    }
  };

  const handleLockAssessment = () => {
    setIsAssessmentLocked(!isAssessmentLocked);
    showNotification(
      isAssessmentLocked ? 'Assessment unlocked' : 'Assessment locked - No new participants can join',
      'info'
    );
  };

  const handleRemoveParticipant = (participantId) => {
    if (window.confirm('Remove this participant from the assessment?')) {
      // Implementation here
      showNotification('Participant removed', 'warning');
    }
  };

  const activeParticipants = Object.values(connectedPeers).filter((p) => p.connected);
  const connectingParticipants = Object.values(connectedPeers).filter((p) => p.connecting && !p.connected);
  const totalParticipants = participants.length;
  const connectedCount = activeParticipants.length;
  const connectingCount = connectingParticipants.length;
  const disconnectedCount = Math.max(0, totalParticipants - connectedCount - connectingCount);
  
  // Log connection state for debugging
  console.log('📊 [MONITOR] Connection state:', {
    totalParticipants,
    connectedCount,
    connectingCount,
    disconnectedCount,
    connectedPeersKeys: Object.keys(connectedPeers),
    participantsList: participants.map(p => p.userName)
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 border-solid mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Loading Monitor Room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Top Navigation Bar */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50 shadow-xl">
        <div className="max-w-[2000px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/assessments/${assessmentId}/monitor`)}
                className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="border-l border-slate-700 pl-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white leading-tight">
                      Assessment Monitor Room
                    </h1>
                    <p className="text-sm text-slate-400">
                      {assessment?.title || 'Loading...'}
                      <span className="ml-2 text-xs text-slate-500 font-mono">
                        [ID: {assessmentId}]
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Center Section - Stats */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-400">
                  {connectedCount} Live
                </span>
              </div>
              
              <div className="flex items-center space-x-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-white">
                  {totalParticipants} Total
                </span>
              </div>

              {disconnectedCount > 0 && (
                <div className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-semibold text-red-400">
                    {disconnectedCount} Offline
                  </span>
                </div>
              )}
            </div>

            {/* Right Section - Lock Status */}
            <div className="flex items-center space-x-3">
              <div
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                  isAssessmentLocked
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                }`}
              >
                {isAssessmentLocked ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Unlock className="w-4 h-4" />
                )}
                <span className="text-sm font-semibold">
                  {isAssessmentLocked ? 'Locked' : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-24 right-6 z-50 animate-slide-in-right">
          <div
            className={`px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-xl ${
              notification.type === 'error'
                ? 'bg-red-500/20 border-red-500/50 text-red-200'
                : notification.type === 'warning'
                ? 'bg-orange-500/20 border-orange-500/50 text-orange-200'
                : notification.type === 'success'
                ? 'bg-green-500/20 border-green-500/50 text-green-200'
                : 'bg-blue-500/20 border-blue-500/50 text-blue-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              {notification.type === 'error' && <XCircle className="w-5 h-5" />}
              {notification.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {notification.type === 'info' && <Activity className="w-5 h-5" />}
              <p className="font-medium">{notification.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[2000px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Participant Grid - Main Section */}
          <div className="flex-1">
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Eye className="w-6 h-6 text-blue-400" />
                  <span>Live Participants</span>
                </h2>
                <button
                  onClick={() => setShowControls(!showControls)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm font-medium"
                >
                  {showControls ? 'Hide' : 'Show'} Controls
                </button>
              </div>

              {/* Participants Grid */}
              {activeParticipants.length === 0 && connectingParticipants.length === 0 ? (
                <div className="text-center py-20">
                  <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-400 mb-2">
                    No participants connected yet
                  </h3>
                  <p className="text-slate-500">
                    {participants.length > 0 
                      ? `${participants.length} participant(s) discovered, waiting for connection...`
                      : 'Participants will appear here when they join the assessment'
                    }
                  </p>
                  {participants.length > 0 && (
                    <div className="mt-4 text-sm text-blue-400">
                      <p>Discovered peers: {participants.map(p => p.userName).join(', ')}</p>
                    </div>
                  )}
                </div>
              ) : connectingParticipants.length > 0 && activeParticipants.length === 0 ? (
                <div className="text-center py-20">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 border-solid mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-blue-400 mb-2">
                    Connecting to {connectingParticipants.length} participant(s)...
                  </h3>
                  <p className="text-slate-500">
                    {connectingParticipants.map(p => p.userName || 'Unknown').join(', ')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {activeParticipants.map((participant) => (
                    <ParticipantCard
                      key={participant.peerId}
                      participant={participant}
                      videoRef={(el) => (videoRefs.current[participant.peerId] = el)}
                      onRemove={() => handleRemoveParticipant(participant.peerId)}
                      onSelect={() => setSelectedParticipant(participant)}
                      isSelected={selectedParticipant?.peerId === participant.peerId}
                      showControls={showControls}
                      attempts={attempts}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Control Panel */}
          <div className="w-80 space-y-4">
            {/* Quick Actions */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleLockAssessment}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                    isAssessmentLocked
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                >
                  {isAssessmentLocked ? (
                    <>
                      <Unlock className="w-5 h-5" />
                      <span>Unlock Assessment</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Lock Assessment</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleEndAssessment}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all duration-200"
                >
                  <Ban className="w-5 h-5" />
                  <span>End Assessment</span>
                </button>
              </div>
            </div>

            {/* Status Summary */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-4">Status Summary</h3>
              <div className="space-y-4">
                <StatusItem
                  icon={<CheckCircle className="w-5 h-5 text-green-400" />}
                  label="Connected"
                  value={connectedCount}
                  color="green"
                />
                <StatusItem
                  icon={<XCircle className="w-5 h-5 text-red-400" />}
                  label="Disconnected"
                  value={disconnectedCount}
                  color="red"
                />
                <StatusItem
                  icon={<AlertTriangle className="w-5 h-5 text-orange-400" />}
                  label="Violations"
                  value={attempts.reduce((sum, a) => sum + (a.violations || 0), 0)}
                  color="orange"
                />
                <StatusItem
                  icon={<Activity className="w-5 h-5 text-blue-400" />}
                  label="Active Attempts"
                  value={attempts.filter((a) => a.status === 'in-progress').length}
                  color="blue"
                />
              </div>
            </div>

            {/* Selected Participant Details */}
            {selectedParticipant && (
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-4">Participant Details</h3>
                <div className="space-y-3">
                  <DetailItem label="Name" value={selectedParticipant.userName} />
                  <DetailItem label="Email" value={selectedParticipant.userEmail} />
                  <DetailItem
                    label="Camera"
                    value={selectedParticipant.hasVideo ? 'Active' : 'Inactive'}
                    status={selectedParticipant.hasVideo ? 'success' : 'error'}
                  />
                  <DetailItem
                    label="Microphone"
                    value={selectedParticipant.hasAudio ? 'Active' : 'Inactive'}
                    status={selectedParticipant.hasAudio ? 'success' : 'error'}
                  />
                  <DetailItem
                    label="Connection"
                    value={selectedParticipant.connected ? 'Stable' : 'Unstable'}
                    status={selectedParticipant.connected ? 'success' : 'warning'}
                  />
                </div>
                
                <button
                  onClick={() => handleRemoveParticipant(selectedParticipant.peerId)}
                  className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg font-semibold transition-all duration-200"
                >
                  <UserX className="w-4 h-4" />
                  <span>Remove Participant</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Participant Card Component
const ParticipantCard = ({
  participant,
  videoRef,
  onRemove,
  onSelect,
  isSelected,
  showControls,
  attempts
}) => {
  const attempt = attempts.find((a) => a.userEmail === participant.userEmail);
  const violations = attempt?.violations || 0;
  const hasVideo = participant.stream?.getVideoTracks().length > 0;
  const hasAudio = participant.stream?.getAudioTracks().length > 0;
  const isVideoEnabled = participant.stream?.getVideoTracks()[0]?.enabled;
  const isAudioEnabled = participant.stream?.getAudioTracks()[0]?.enabled;

  return (
    <div
      onClick={onSelect}
      className={`group relative bg-slate-800/50 rounded-xl overflow-hidden border-2 transition-all duration-300 cursor-pointer hover:scale-105 ${
        isSelected
          ? 'border-blue-500 shadow-xl shadow-blue-500/20'
          : 'border-slate-700/50 hover:border-slate-600'
      }`}
    >
      {/* Video Feed */}
      <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-950 relative">
        {hasVideo && isVideoEnabled ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-slate-400">
                  {participant.userName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <p className="text-xs text-slate-500">Camera Off</p>
            </div>
          </div>
        )}

        {/* Status Indicators Overlay */}
        <div className="absolute top-2 right-2 flex space-x-1">
          {hasVideo && isVideoEnabled ? (
            <div className="p-1.5 bg-green-500/80 backdrop-blur-sm rounded-lg">
              <Video className="w-3 h-3 text-white" />
            </div>
          ) : (
            <div className="p-1.5 bg-red-500/80 backdrop-blur-sm rounded-lg">
              <VideoOff className="w-3 h-3 text-white" />
            </div>
          )}

          {hasAudio && isAudioEnabled ? (
            <div className="p-1.5 bg-green-500/80 backdrop-blur-sm rounded-lg">
              <Mic className="w-3 h-3 text-white" />
            </div>
          ) : (
            <div className="p-1.5 bg-red-500/80 backdrop-blur-sm rounded-lg">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Violation Badge */}
        {violations > 0 && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 rounded-lg flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3 text-white" />
            <span className="text-xs font-bold text-white">{violations}</span>
          </div>
        )}

        {/* Connection Status */}
        <div className="absolute bottom-2 left-2">
          <div className="flex items-center space-x-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg">
            <div className={`w-2 h-2 rounded-full ${participant.connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            <span className="text-xs text-white font-medium">
              {participant.connected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Participant Info */}
      <div className="p-3 bg-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white text-sm truncate">
              {participant.userName || 'Unknown'}
            </h4>
            <p className="text-xs text-slate-400 truncate">
              {participant.userEmail || 'No email'}
            </p>
          </div>

          {showControls && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Attempt Info */}
        {attempt && (
          <div className="mt-2 pt-2 border-t border-slate-700 flex items-center justify-between text-xs">
            <span className="text-slate-400">Attempt {attempt.attemptNumber || 1}</span>
            <span className={`font-semibold ${violations >= 2 ? 'text-red-400' : 'text-green-400'}`}>
              {violations}/3 violations
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Status Item Component
const StatusItem = ({ icon, label, value, color }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-2">
      {icon}
      <span className="text-sm text-slate-400">{label}</span>
    </div>
    <span className={`text-lg font-bold text-${color}-400`}>{value}</span>
  </div>
);

// Detail Item Component
const DetailItem = ({ label, value, status }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
    <span className="text-sm text-slate-400">{label}</span>
    <span
      className={`text-sm font-semibold ${
        status === 'success'
          ? 'text-green-400'
          : status === 'error'
          ? 'text-red-400'
          : status === 'warning'
          ? 'text-orange-400'
          : 'text-white'
      }`}
    >
      {value}
    </span>
  </div>
);

export default AssessmentMonitorRoom;

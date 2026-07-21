// API endpoint for peer discovery (replaces Socket.IO for basic signaling)
// Uses Firestore for persistence (Vercel serverless functions are stateless)
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, query, where, getDoc } from 'firebase/firestore';

// TEMPORARY: Hard-coded Firebase config for immediate fix
// TODO: Move to Vercel environment variables
const FIREBASE_CONFIG = {
  apiKey: "your_firebase_api_key",
  authDomain: "your_project.firebaseapp.com",
  projectId: "your_project_id",
  storageBucket: "your_project.appspot.com",
  messagingSenderId: "your_sender_id",
  appId: "your_app_id",
  measurementId: "your_measurement_id"
};

// Initialize Firebase
if (!getApps().length) {
  try {
    console.log('🔥 Initializing Firebase with projectId:', FIREBASE_CONFIG.projectId);
    initializeApp(FIREBASE_CONFIG);
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
  }
}

const db = getFirestore();

// Helper function to determine collection type and get peers reference
async function getPeersCollection(meetingId) {
  // Try assessments collection first
  try {
    const assessmentRef = doc(db, 'assessments', meetingId);
    const assessmentSnap = await getDoc(assessmentRef);
    if (assessmentSnap.exists()) {
      console.log('✅ Found assessment:', meetingId);
      return { collection: 'assessments', exists: true };
    }
  } catch (error) {
    console.log('Assessment not found, trying meetings:', error.message);
  }
  
  // Fall back to meetings collection
  try {
    const meetingRef = doc(db, 'meetings', meetingId);
    const meetingSnap = await getDoc(meetingRef);
    if (meetingSnap.exists()) {
      console.log('✅ Found meeting:', meetingId);
      return { collection: 'meetings', exists: true };
    }
  } catch (error) {
    console.log('Meeting not found:', error.message);
  }
  
  // Default to meetings if neither found (for new meetings)
  return { collection: 'meetings', exists: false };
}

export default async function handler(req, res) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Peer-ID');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const { meetingId, action, userId: queryUserId } = req.query;
    
    console.log(`\n🌐 ${req.method} /api/peer-discovery/${meetingId || 'undefined'}`);
    console.log('📊 Query:', req.query);
    console.log('📦 Body:', req.body);
  
  // Handle sendBeacon delete action via GET with action=delete
  if (req.method === 'GET' && action === 'delete' && queryUserId) {
    try {
      if (!meetingId || !queryUserId) {
        return res.status(400).json({
          success: false,
          error: 'Missing meetingId or userId'
        });
      }

      // Determine which collection to use
      const { collection: collectionName } = await getPeersCollection(meetingId);

      // Delete peer from Firestore (from correct collection)
      const peerRef = doc(db, collectionName, meetingId, 'activePeers', queryUserId);
      await deleteDoc(peerRef);

      return res.status(200).json({
        success: true,
        message: 'Peer removed via beacon'
      });
    } catch (error) {
      console.error('Error removing peer via beacon:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  if (req.method === 'POST') {
    // Register a peer in the meeting/assessment
    try {
      const { peerId, userId, userName, userEmail, profilePicUrl, isHost, isMonitor, hasVideo, hasAudio } = req.body;
      
      console.log(`\n🔵 POST /api/peer-discovery/${meetingId}`);
      console.log('📥 Body:', { peerId, userId, userName, isHost, isMonitor });
      
      if (!meetingId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Missing meetingId or userId'
        });
      }

      if (!peerId) {
        console.warn('⚠️ WARNING: No peerId provided, using userId as fallback');
      }

      // Determine which collection to use (assessments or meetings)
      const { collection: collectionName } = await getPeersCollection(meetingId);
      console.log(`📡 Using ${collectionName} collection for peer registration`);

      // Calculate document ID once
      const docId = peerId || userId;
      console.log(`📝 Using document ID: ${docId.slice(0, 12)}...`);

      // Remove any duplicate/old entries for this user (by userId or userEmail)
      // This prevents duplicates when users reload/rejoin
      const activePeersRef = collection(db, collectionName, meetingId, 'activePeers');
      const allPeersSnapshot = await getDocs(activePeersRef);
      const duplicatesToRemove = [];
      
      for (const peerDoc of allPeersSnapshot.docs) {
        const data = peerDoc.data();
        
        // If same userId or userEmail but different peerId, it's a duplicate (old session)
        if (peerDoc.id !== docId && (data.userId === userId || (userEmail && data.userEmail === userEmail))) {
          console.log(`🗑️ Removing duplicate/old peer: ${data.userName} (${peerDoc.id.slice(0, 8)}...)`);
          duplicatesToRemove.push(deleteDoc(peerDoc.ref));
        }
      }
      
      // Delete all duplicates
      if (duplicatesToRemove.length > 0) {
        await Promise.all(duplicatesToRemove);
        console.log(`✅ Removed ${duplicatesToRemove.length} duplicate peer(s)`);
      }

      // Store peer in Firestore (in the correct collection)
      const peerRef = doc(db, collectionName, meetingId, 'activePeers', docId);
      await setDoc(peerRef, {
        peerId: peerId || userId, // Store PeerJS ID for WebRTC connections
        userId,
        userName: userName || 'Anonymous',
        userEmail: userEmail || '',
        profilePicUrl: profilePicUrl || '',
        isHost: isHost || false,
        isMonitor: isMonitor || false,
        hasVideo: hasVideo !== false,
        hasAudio: hasAudio !== false,
        joinedAt: new Date().toISOString(),
        lastSeen: Date.now()
      }, { merge: true });
      console.log(`✅ Peer registered: ${userName} (${userId.slice(0, 8)}...) as ${isHost ? 'HOST' : 'PARTICIPANT'}`);

      // Clean up old peers (older than 30 seconds)
      const thirtySecondsAgo = Date.now() - (30 * 1000);
      const stalePeersQuery = query(activePeersRef, where('lastSeen', '<', thirtySecondsAgo));
      const stalePeersSnapshot = await getDocs(stalePeersQuery);
      
      for (const peerDoc of stalePeersSnapshot.docs) {
        console.log('Removing stale peer:', peerDoc.id);
        await deleteDoc(peerDoc.ref);
      }

      // Get list of other peers in the meeting/assessment
      const peersSnapshot = await getDocs(activePeersRef);
      
      console.log(`📊 Total peers in database: ${peersSnapshot.size}`);
      peersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.userName} | PeerID: ${data.peerId?.slice(0, 8)}... | UserID: ${data.userId?.slice(0, 8)}... | ${data.isMonitor ? 'MONITOR' : 'PARTICIPANT'}`);
      });
      
      // Filter out self and deduplicate by userId (keep most recent based on lastSeen)
      const allPeers = peersSnapshot.docs.map(doc => doc.data());
      const selfPeerId = peerId || userId;
      
      // First deduplicate ALL peers (including self) by userId
      const allPeersByUserId = new Map();
      allPeers.forEach(peer => {
        const existing = allPeersByUserId.get(peer.userId);
        if (!existing || peer.lastSeen > existing.lastSeen) {
          allPeersByUserId.set(peer.userId, peer);
        }
      });
      
      const deduplicatedAllPeers = Array.from(allPeersByUserId.values());
      
      // Then remove self
      const otherPeers = deduplicatedAllPeers.filter(p => p.peerId !== selfPeerId);

      console.log(`📋 Returning ${otherPeers.length} peer(s) to caller (excluding self and deduplicated by userId)`);
      otherPeers.forEach(p => {
        console.log(`     → ${p.userName} (PeerID: ${p.peerId?.slice(0, 8)}... | UserID: ${p.userId?.slice(0, 8)}...)`);
      });

      return res.status(200).json({
        success: true,
        peers: otherPeers,
        totalPeers: deduplicatedAllPeers.length
      });
    } catch (error) {
      console.error('Error registering peer:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  if (req.method === 'GET') {
    // Get list of peers in the meeting/assessment (also acts as heartbeat if userId provided)
    try {
      const { userId } = req.query;
      console.log(`\n🟢 GET /api/peer-discovery/${meetingId}${userId ? ` (heartbeat for user: ${userId.slice(0, 8)}...)` : ''}`);
      
      if (!meetingId) {
        return res.status(400).json({
          success: false,
          error: 'Missing meetingId'
        });
      }

      // Determine which collection to use
      const { collection: collectionName } = await getPeersCollection(meetingId);
      console.log(`📡 Using ${collectionName} collection`);

      // If userId provided, update lastSeen (heartbeat)
      // Note: With peerId as doc ID, heartbeat needs peerId not userId
      if (userId) {
        // Skip heartbeat update here - will be handled by POST on reconnect
        // (since we use peerId as doc ID now, we don't know the doc ID from userId alone)
      }

      // Clean up old peers (older than 30 seconds)
      const thirtySecondsAgo = Date.now() - (30 * 1000);
      const activePeersRef = collection(db, collectionName, meetingId, 'activePeers');
      const stalePeersQuery = query(activePeersRef, where('lastSeen', '<', thirtySecondsAgo));
      const stalePeersSnapshot = await getDocs(stalePeersQuery);
      
      for (const peerDoc of stalePeersSnapshot.docs) {
        await deleteDoc(peerDoc.ref);
      }

      // Get current peers
      const peersSnapshot = await getDocs(activePeersRef);
      
      console.log(`📊 Total peers in database: ${peersSnapshot.size}`);
      peersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.userName} | PeerID: ${data.peerId?.slice(0, 8)}... | UserID: ${data.userId?.slice(0, 8)}... | ${data.isMonitor ? 'MONITOR' : 'PARTICIPANT'}`);
      });
      
      // Deduplicate by userId - keep only the most recent peer for each userId
      const allPeers = peersSnapshot.docs.map(doc => doc.data());
      const peersByUserId = new Map();
      
      allPeers.forEach(peer => {
        const existing = peersByUserId.get(peer.userId);
        if (!existing || peer.lastSeen > existing.lastSeen) {
          peersByUserId.set(peer.userId, peer);
        }
      });
      
      const deduplicatedPeers = Array.from(peersByUserId.values());
      const filteredPeers = userId ? deduplicatedPeers.filter(p => p.userId !== userId) : deduplicatedPeers;
      
      console.log(`📋 Returning ${filteredPeers.length} peer(s) to caller${userId ? ' (excluding self)' : ''} (deduplicated by userId)`);

      return res.status(200).json({
        success: true,
        peers: filteredPeers,
        totalPeers: deduplicatedPeers.length
      });
    } catch (error) {
      console.error('Error getting peers:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  if (req.method === 'DELETE') {
    // Remove a peer from the meeting/assessment
    try {
      // Support both body and query params (for sendBeacon compatibility)
      // Use peerId as primary identifier (since it's the document ID now)
      let peerId = req.body?.peerId || req.query?.peerId;
      let userId = req.body?.userId || req.query?.userId;
      
      // Use peerId if available, fallback to userId for backward compatibility
      const docId = peerId || userId;
      
      if (!meetingId || !docId) {
        return res.status(400).json({
          success: false,
          error: 'Missing meetingId or peerId/userId'
        });
      }

      // Determine which collection to use
      const { collection: collectionName } = await getPeersCollection(meetingId);

      // Delete peer from Firestore (from correct collection)
      const peerRef = doc(db, collectionName, meetingId, 'activePeers', docId);
      await deleteDoc(peerRef);

      return res.status(200).json({
        success: true,
        message: 'Peer removed'
      });
    } catch (error) {
      console.error('Error removing peer:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  return res.status(405).json({ 
    success: false, 
    error: `Method ${req.method} not allowed` 
  });
  
  } catch (error) {
    console.error('🔥 FATAL ERROR in peer-discovery handler:', error);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

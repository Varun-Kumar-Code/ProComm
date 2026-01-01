// API endpoint for peer discovery (replaces Socket.IO for basic signaling)
const meetings = new Map();

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { meetingId } = req.query;

  if (req.method === 'POST') {
    // Register a peer in the meeting
    try {
      const { userId, userName, userEmail } = req.body;
      
      if (!meetingId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Missing meetingId or userId'
        });
      }

      // Get or create meeting
      if (!meetings.has(meetingId)) {
        meetings.set(meetingId, new Map());
      }
      
      const meetingPeers = meetings.get(meetingId);
      
      // Add peer with timestamp
      meetingPeers.set(userId, {
        userId,
        userName: userName || 'Anonymous',
        userEmail: userEmail || '',
        joinedAt: new Date().toISOString(),
        lastSeen: Date.now()
      });

      // Clean up old peers (older than 15 seconds - aggressive cleanup for stale connections)
      const fifteenSecondsAgo = Date.now() - (15 * 1000);
      for (const [peerId, peerData] of meetingPeers.entries()) {
        if (peerData.lastSeen < fifteenSecondsAgo) {
          console.log('Removing stale peer:', peerId);
          meetingPeers.delete(peerId);
        }
      }

      // Return list of other peers in the meeting
      const otherPeers = Array.from(meetingPeers.values())
        .filter(p => p.userId !== userId);

      return res.status(200).json({
        success: true,
        peers: otherPeers,
        totalPeers: meetingPeers.size
      });
    } catch (error) {
      console.error('Error registering peer:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  if (req.method === 'GET') {
    // Get list of peers in the meeting
    try {
      if (!meetingId) {
        return res.status(400).json({
          success: false,
          error: 'Missing meetingId'
        });
      }

      const meetingPeers = meetings.get(meetingId);
      if (!meetingPeers) {
        return res.status(200).json({
          success: true,
          peers: [],
          totalPeers: 0
        });
      }

      // Clean up old peers (same 15 second timeout as POST for consistency)
      const fifteenSecondsAgo = Date.now() - (15 * 1000);
      for (const [peerId, peerData] of meetingPeers.entries()) {
        if (peerData.lastSeen < fifteenSecondsAgo) {
          meetingPeers.delete(peerId);
        }
      }

      const peers = Array.from(meetingPeers.values());

      return res.status(200).json({
        success: true,
        peers,
        totalPeers: peers.length
      });
    } catch (error) {
      console.error('Error getting peers:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  if (req.method === 'DELETE') {
    // Remove a peer from the meeting
    try {
      const { userId } = req.body;
      
      if (!meetingId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Missing meetingId or userId'
        });
      }

      const meetingPeers = meetings.get(meetingId);
      if (meetingPeers) {
        meetingPeers.delete(userId);
        
        // Delete meeting if no peers left
        if (meetingPeers.size === 0) {
          meetings.delete(meetingId);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Peer removed'
      });
    } catch (error) {
      console.error('Error removing peer:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  return res.status(405).json({ 
    success: false, 
    error: `Method ${req.method} not allowed` 
  });
}

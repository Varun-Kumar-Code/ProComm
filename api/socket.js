// REST API handler for Vercel (Socket.IO doesn't work well with serverless)
// Using in-memory storage for reactions and hand raises (temp solution - consider Redis for production)
// Note: Vercel serverless may create multiple instances, causing state loss

const roomReactions = new Map(); // Map<roomId, Array<reactions>>
const roomHandRaises = new Map(); // Map<roomId, Set<userName>>

// Log when module initializes to track cold starts
console.log('[INIT] API handler module loaded at', new Date().toISOString());

const ioHandler = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle GET - fetch reactions and hand raises for a room
  if (req.method === 'GET') {
    const { roomId, type } = req.query;
    if (!roomId) {
      res.status(400).json({ error: 'roomId required' });
      return;
    }
    
    if (type === 'hands') {
      // Get hand raises
      const handsRaised = roomHandRaises.get(roomId) || new Set();
      console.log(`[GET HANDS] Room ${roomId}: ${Array.from(handsRaised).join(', ') || 'none'}`);
      res.status(200).json({ handsRaised: Array.from(handsRaised) });
      return;
    }
    
    // Default: Get reactions
    const reactions = roomReactions.get(roomId) || [];
    // Clean up old reactions (older than 5 seconds)
    const now = Date.now();
    const freshReactions = reactions.filter(r => now - r.timestamp < 5000);
    roomReactions.set(roomId, freshReactions);
    
    res.status(200).json({ reactions: freshReactions });
    return;
  }

  // Handle POST - add new reaction or raise hand
  if (req.method === 'POST') {
    const { roomId, reaction, handRaise } = req.body;
    
    if (handRaise) {
      // Handle hand raise
      const { userName, isRaised } = handRaise;
      if (!roomId || !userName) {
        res.status(400).json({ error: 'roomId and userName required' });
        return;
      }
      
      let handsRaised = roomHandRaises.get(roomId) || new Set();
      if (isRaised) {
        handsRaised.add(userName);
      } else {
        handsRaised.delete(userName);
      }
      roomHandRaises.set(roomId, handsRaised);
      
      console.log(`[HAND] ${userName} ${isRaised ? 'raised' : 'lowered'} hand in room ${roomId}`);
      console.log(`[HAND] Current hands raised:`, Array.from(handsRaised));
      res.status(200).json({ success: true, handsRaised: Array.from(handsRaised) });
      return;
    }
    
    if (reaction) {
      // Handle reaction
      if (!roomId || !reaction) {
        res.status(400).json({ error: 'roomId and reaction required' });
        return;
      }
      
      const reactions = roomReactions.get(roomId) || [];
      reactions.push(reaction);
      roomReactions.set(roomId, reactions);
      
      console.log(`[REACTION] Added ${reaction.emoji} to room ${roomId} by ${reaction.userName}`);
      res.status(200).json({ success: true, reaction });
      return;
    }
    
    res.status(400).json({ error: 'reaction or handRaise required' });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};

export default ioHandler;

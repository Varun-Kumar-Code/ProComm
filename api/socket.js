// REST API handler for Vercel (Socket.IO doesn't work well with serverless)
// Using in-memory storage for reactions and hand raises
// WORKAROUND: Store both in same Map since Vercel serverless instances are short-lived (~30s)

const roomData = new Map(); // Map<roomId, { reactions: Array, handsRaised: Set }>

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
    
    const data = roomData.get(roomId) || { reactions: [], handsRaised: new Set() };
    
    if (type === 'hands') {
      // Get hand raises
      console.log(`[GET HANDS] Room ${roomId}: ${Array.from(data.handsRaised).join(', ') || 'none'}`);
      res.status(200).json({ handsRaised: Array.from(data.handsRaised) });
      return;
    }
    
    // Default: Get reactions
    const now = Date.now();
    const freshReactions = data.reactions.filter(r => now - r.timestamp < 5000);
    
    // Update the room data with fresh reactions
    roomData.set(roomId, { ...data, reactions: freshReactions });
    
    res.status(200).json({ reactions: freshReactions });
    return;
  }

  // Handle POST - add new reaction or raise hand
  if (req.method === 'POST') {
    const { roomId, reaction, handRaise } = req.body;
    
    const data = roomData.get(roomId) || { reactions: [], handsRaised: new Set() };
    
    if (handRaise) {
      // Handle hand raise
      const { userName, isRaised } = handRaise;
      if (!roomId || !userName) {
        res.status(400).json({ error: 'roomId and userName required' });
        return;
      }
      
      if (isRaised) {
        data.handsRaised.add(userName);
      } else {
        data.handsRaised.delete(userName);
      }
      
      roomData.set(roomId, data);
      
      console.log(`[HAND] ${userName} ${isRaised ? 'raised' : 'lowered'} hand in room ${roomId}`);
      console.log(`[HAND] Current hands raised:`, Array.from(data.handsRaised));
      res.status(200).json({ success: true, handsRaised: Array.from(data.handsRaised) });
      return;
    }
    
    if (reaction) {
      // Handle reaction
      if (!roomId || !reaction) {
        res.status(400).json({ error: 'roomId and reaction required' });
        return;
      }
      
      data.reactions.push(reaction);
      roomData.set(roomId, data);
      
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

// REST API handler for Vercel (Socket.IO doesn't work well with serverless)
// Using in-memory storage for reactions and hand raises
// WORKAROUND: Store both in same Map since Vercel serverless instances are short-lived (~30s)
// Hand raises now use peer IDs instead of userNames to support duplicate names

const roomData = new Map(); // Map<roomId, { reactions: Array, handsRaised: Map<peerId, userName>, messages: Array, polls: Array }>

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
    
    const data = roomData.get(roomId) || { reactions: [], handsRaised: new Map(), messages: [], polls: [] };
    
    if (type === 'hands') {
      // Get hand raises - return array of peer IDs
      const peerIds = Array.from(data.handsRaised.keys());
      console.log(`[GET HANDS] Room ${roomId}: ${peerIds.join(', ') || 'none'}`);
      res.status(200).json({ handsRaised: peerIds });
      return;
    }
    
    if (type === 'messages') {
      // Get chat messages
      console.log(`[GET MESSAGES] Room ${roomId}: ${data.messages.length} messages`);
      res.status(200).json({ messages: data.messages });
      return;
    }
    
    if (type === 'polls') {
      // Get polls
      console.log(`[GET POLLS] Room ${roomId}: ${data.polls.length} polls`);
      res.status(200).json({ polls: data.polls });
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

  // Handle POST - add new reaction, raise hand, or send message
  if (req.method === 'POST') {
    const { roomId, reaction, handRaise, message, type, poll, pollId, optionId, userName } = req.body;
    
    const data = roomData.get(roomId) || { reactions: [], handsRaised: new Map(), messages: [], polls: [] };
    
    if (type === 'poll') {
      // Handle poll creation
      if (!roomId || !poll) {
        res.status(400).json({ error: 'roomId and poll required' });
        return;
      }
      
      data.polls.push(poll);
      roomData.set(roomId, data);
      
      console.log(`[POLL] Created poll: ${poll.question} by ${poll.createdBy}`);
      res.status(200).json({ success: true, poll });
      return;
    }
    
    if (type === 'pollVote') {
      // Handle poll vote
      if (!roomId || pollId === undefined || optionId === undefined || !userName) {
        res.status(400).json({ error: 'roomId, pollId, optionId, and userName required' });
        return;
      }
      
      // Find the poll and update vote
      const pollIndex = data.polls.findIndex(p => p.id === pollId);
      if (pollIndex !== -1) {
        const poll = data.polls[pollIndex];
        const option = poll.options.find(opt => opt.id === optionId);
        
        if (option) {
          // Check if user already voted
          const alreadyVoted = poll.options.some(opt => opt.voters.includes(userName));
          
          if (!alreadyVoted) {
            option.votes += 1;
            option.voters.push(userName);
            
            roomData.set(roomId, data);
            console.log(`[POLL VOTE] ${userName} voted for option ${optionId} in poll ${pollId}`);
          }
        }
      }
      
      res.status(200).json({ success: true });
      return;
    }
    
    if (handRaise) {
      // Handle hand raise using peer ID
      const { peerId, userName, isRaised } = handRaise;
      if (!roomId || !peerId) {
        res.status(400).json({ error: 'roomId and peerId required' });
        return;
      }
      
      if (isRaised) {
        data.handsRaised.set(peerId, userName); // Store peerId -> userName mapping
      } else {
        data.handsRaised.delete(peerId);
      }
      
      roomData.set(roomId, data);
      
      const peerIds = Array.from(data.handsRaised.keys());
      console.log(`[HAND] ${userName} (${peerId}) ${isRaised ? 'raised' : 'lowered'} hand in room ${roomId}`);
      console.log(`[HAND] Current hands raised:`, peerIds);
      res.status(200).json({ success: true, handsRaised: peerIds });
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
    
    if (message) {
      // Handle chat message
      if (!roomId || !message) {
        res.status(400).json({ error: 'roomId and message required' });
        return;
      }
      
      data.messages.push(message);
      roomData.set(roomId, data);
      
      console.log(`[MESSAGE] ${message.userName}: ${message.message.substring(0, 50)}...`);
      res.status(200).json({ success: true, message });
      return;
    }
    
    res.status(400).json({ error: 'reaction, handRaise, message, or poll required' });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};

export default ioHandler;

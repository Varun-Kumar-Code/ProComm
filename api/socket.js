// REST API handler for Vercel (Socket.IO doesn't work well with serverless)
// Using in-memory storage for reactions (temp solution - consider Redis for production)

const roomReactions = new Map(); // Map<roomId, Array<reactions>>
const participants = new Map();

const ioHandler = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle GET - fetch reactions for a room
  if (req.method === 'GET') {
    const { roomId } = req.query;
    if (!roomId) {
      res.status(400).json({ error: 'roomId required' });
      return;
    }
    
    const reactions = roomReactions.get(roomId) || [];
    // Clean up old reactions (older than 5 seconds)
    const now = Date.now();
    const freshReactions = reactions.filter(r => now - r.timestamp < 5000);
    roomReactions.set(roomId, freshReactions);
    
    res.status(200).json({ reactions: freshReactions });
    return;
  }

  // Handle POST - add new reaction
  if (req.method === 'POST') {
    const { roomId, reaction } = req.body;
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

  res.status(405).json({ error: 'Method not allowed' });
};

// OLD SOCKET.IO CODE COMMENTED OUT (doesn't work on Vercel Hobby)
/*
import { Server } from 'socket.io';

*/

  res.status(200).end();

    // Handle poll creation
    socket.on('poll-created', (data) => {
      const participant = participants.get(socket.id);
      if (participant) {
        io.to(participant.meetingId).emit('poll-created', {
          poll: data.poll
        });
      }
    });

    // Handle poll votes
    socket.on('poll-vote', (data) => {
      const participant = participants.get(socket.id);
      if (participant) {
        io.to(participant.meetingId).emit('poll-vote', {
          poll: data.poll
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const participant = participants.get(socket.id);
      if (participant) {
        socket.to(participant.meetingId).emit('user-left', {
          userId: participant.userId,
          userName: participant.userName
        });
        participants.delete(socket.id);
      }
    });

    // Handle screen sharing
    socket.on('screen-share-start', (roomId, userId) => {
      socket.to(roomId).emit('user-screen-share-start', userId);
    });
*/

  res.status(200).end();
};

export default ioHandler;
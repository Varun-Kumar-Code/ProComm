// Socket.IO handler for Vercel
import { Server } from 'socket.io';

const participants = new Map();

const ioHandler = (req, res) => {
  if (res.socket.server.io) {
    console.log('Socket.io already running');
    res.end();
    return;
  }

  const io = new Server(res.socket.server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  res.socket.server.io = io;

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join meeting room
    socket.on('join-meeting', (meetingId, userId, userName, userEmail) => {
      console.log(`User ${userName} (${userId}) joining meeting ${meetingId}`);
      
      participants.set(socket.id, {
        userId,
        userName,
        userEmail,
        meetingId,
        joinedAt: new Date()
      });

      socket.join(meetingId);
      
      socket.to(meetingId).emit('user-joined', {
        userId,
        userName,
        userEmail,
        socketId: socket.id
      });

      const meetingParticipants = Array.from(participants.values())
        .filter(p => p.meetingId === meetingId && p.userId !== userId);
      
      socket.emit('existing-participants', meetingParticipants);
    });

    // Handle chat messages
    socket.on('chat-message', (data) => {
      const participant = participants.get(socket.id);
      if (participant) {
        const messageData = {
          id: Date.now() + Math.random(),
          userId: participant.userId,
          userName: participant.userName,
          message: data.message,
          timestamp: new Date(),
          type: 'text'
        };
        io.to(participant.meetingId).emit('chat-message', messageData);
      }
    });

    // Handle reactions
    socket.on('reaction', (data) => {
      const participant = participants.get(socket.id);
      if (participant) {
        io.to(participant.meetingId).emit('reaction', {
          reaction: data.reaction
        });
      }
    });

    // Handle hand raise
    socket.on('hand-raised', (data) => {
      const participant = participants.get(socket.id);
      if (participant) {
        io.to(participant.meetingId).emit('hand-raised', {
          userName: data.userName,
          isRaised: data.isRaised
        });
      }
    });

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

    socket.on('screen-share-stop', (roomId, userId) => {
      socket.to(roomId).emit('user-screen-share-stop', userId);
    });
  });

  console.log('Socket.io server started');
  res.end();
};

export default ioHandler;
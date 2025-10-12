const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const { v4: uuidV4 } = require('uuid');

// Import routes
const meetingRoutes = require('./routes/meetings');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? true  // Allow all origins in production for Vercel
      : ["http://localhost:3000", "http://192.168.1.2:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? true  // Allow all origins in production for Vercel
    : ["http://localhost:3000", "http://192.168.1.2:3000"],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (for production build)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// API Routes
app.use('/api/meetings', meetingRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// In-memory storage (replace with database in production)
const meetings = new Map();
const participants = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join meeting room
  socket.on('join-meeting', (meetingId, userId, userName, userEmail) => {
    console.log(`User ${userName} (${userId}) joining meeting ${meetingId}`);
    
    // Store participant info
    participants.set(socket.id, {
      userId,
      userName,
      userEmail,
      meetingId,
      joinedAt: new Date()
    });

    // Join socket room
    socket.join(meetingId);
    
    // Notify others in the meeting
    socket.to(meetingId).emit('user-joined', {
      userId,
      userName,
      userEmail,
      socketId: socket.id
    });

    // Send list of existing participants to the new user
    const meetingParticipants = Array.from(participants.values())
      .filter(p => p.meetingId === meetingId && p.userId !== userId);
    
    socket.emit('existing-participants', meetingParticipants);
  });

  // Handle peer connection signals
  socket.on('signal', (data) => {
    const { target, signal, userId } = data;
    socket.to(target).emit('signal', {
      signal,
      userId,
      socketId: socket.id
    });
  });

  // Handle media state changes
  socket.on('media-state-change', (data) => {
    const participant = participants.get(socket.id);
    if (participant) {
      socket.to(participant.meetingId).emit('participant-media-change', {
        userId: participant.userId,
        ...data
      });
    }
  });

  // Handle screen sharing
  socket.on('start-screen-share', (data) => {
    const participant = participants.get(socket.id);
    if (participant) {
      socket.to(participant.meetingId).emit('user-started-screen-share', {
        userId: participant.userId,
        userName: participant.userName,
        ...data
      });
    }
  });

  socket.on('stop-screen-share', () => {
    const participant = participants.get(socket.id);
    if (participant) {
      socket.to(participant.meetingId).emit('user-stopped-screen-share', {
        userId: participant.userId
      });
    }
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    console.log('💬 Chat message received on server:', data);
    const participant = participants.get(socket.id);
    console.log('💬 Participant found:', !!participant);
    
    if (participant) {
      const messageData = {
        id: uuidV4(),
        userId: participant.userId,
        userName: participant.userName,
        message: data.message,
        timestamp: new Date(),
        type: 'text'
      };
      
      console.log('💬 Broadcasting message to meeting:', participant.meetingId);
      console.log('💬 Message data:', messageData);
      
      // Send to all participants in the meeting
      io.to(participant.meetingId).emit('chat-message', messageData);
      console.log('💬 Message broadcasted successfully');
    } else {
      console.warn('⚠️ No participant found for chat message');
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const participant = participants.get(socket.id);
    if (participant) {
      // Notify others in the meeting
      socket.to(participant.meetingId).emit('user-left', {
        userId: participant.userId,
        userName: participant.userName
      });
      
      // Remove from participants
      participants.delete(socket.id);
    }
  });

  // Handle reactions
  socket.on('reaction', (data) => {
    console.log('😀 Reaction received on server:', data);
    const participant = participants.get(socket.id);
    if (participant) {
      // Broadcast reaction to all participants in the meeting (including sender)
      io.to(participant.meetingId).emit('reaction', {
        reaction: data.reaction
      });
      console.log('😀 Reaction broadcasted to meeting:', participant.meetingId);
    } else {
      console.warn('⚠️ No participant found for reaction');
    }
  });

  // Handle hand raise events
  socket.on('hand-raised', (data) => {
    console.log('✋ Hand raise event:', data);
    const participant = participants.get(socket.id);
    if (participant) {
      // Broadcast hand raise to all participants in the meeting
      io.to(participant.meetingId).emit('hand-raised', {
        userName: data.userName,
        isRaised: data.isRaised
      });
      console.log('✋ Hand raise broadcasted to meeting:', participant.meetingId);
    }
  });

  // Handle poll creation
  socket.on('poll-created', (data) => {
    console.log('📊 Poll created:', data);
    const participant = participants.get(socket.id);
    if (participant) {
      // Broadcast poll to all participants in the meeting
      io.to(participant.meetingId).emit('poll-created', {
        poll: data.poll
      });
      console.log('📊 Poll broadcasted to meeting:', participant.meetingId);
    }
  });

  // Handle poll votes
  socket.on('poll-vote', (data) => {
    console.log('🗳️ Poll vote:', data);
    const participant = participants.get(socket.id);
    if (participant) {
      // Broadcast poll vote to all participants in the meeting
      io.to(participant.meetingId).emit('poll-vote', {
        poll: data.poll
      });
      console.log('🗳️ Poll vote broadcasted to meeting:', participant.meetingId);
    }
  });

  // Handle leave meeting
  socket.on('leave-meeting', () => {
    const participant = participants.get(socket.id);
    if (participant) {
      socket.to(participant.meetingId).emit('user-left', {
        userId: participant.userId,
        userName: participant.userName
      });
      
      socket.leave(participant.meetingId);
      participants.delete(socket.id);
    }
  });
});

// Catch-all handler for React Router (production)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`🚀 ProComm server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for connections`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
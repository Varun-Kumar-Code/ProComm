// Socket.IO handler for Vercel
import { Server } from 'socket.io';

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
    socket.on('join-room', (roomId, userId, userName) => {
      console.log(`User ${userName} (${userId}) joining room ${roomId}`);
      socket.join(roomId);
      socket.to(roomId).emit('user-connected', userId, userName);

      // Handle user disconnection
      socket.on('disconnect', () => {
        console.log(`User ${userName} disconnected`);
        socket.to(roomId).emit('user-disconnected', userId);
      });
    });

    // Handle chat messages
    socket.on('send-chat-message', (roomId, message, senderName) => {
      socket.to(roomId).emit('receive-chat-message', message, senderName, socket.id);
    });

    // Handle video/audio toggles
    socket.on('video-toggle', (roomId, userId, isEnabled) => {
      socket.to(roomId).emit('user-video-toggle', userId, isEnabled);
    });

    socket.on('audio-toggle', (roomId, userId, isEnabled) => {
      socket.to(roomId).emit('user-audio-toggle', userId, isEnabled);
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
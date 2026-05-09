const { Server } = require('socket.io');
const { verifyAccess } = require('../utils/jwt');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = verifyAccess(token);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    socket.join(`user:${id}`);
    if (role === 'admin') socket.join('admins');
    else socket.join('members');

    socket.on('join:live', (sessionId) => {
      socket.join(`live:${sessionId}`);
    });

    socket.on('leave:live', (sessionId) => {
      socket.leave(`live:${sessionId}`);
    });

    socket.on('live:message', ({ sessionId, message }) => {
      if (socket.user.role === 'admin') {
        io.to(`live:${sessionId}`).emit('live:message', {
          from: socket.user.id,
          message,
          at: new Date().toISOString(),
        });
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

const emitToUser = (userId, event, data) => {
  getIO().to(`user:${userId}`).emit(event, data);
};

const emitToAll = (event, data) => {
  getIO().emit(event, data);
};

const emitToLive = (sessionId, event, data) => {
  getIO().to(`live:${sessionId}`).emit(event, data);
};

module.exports = { initSocket, getIO, emitToUser, emitToAll, emitToLive };

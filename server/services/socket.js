const { Server } = require('socket.io');
const logger = require('../utils/logger');
const notificationRouter = require('./notification_router');

let io;
const activeUsers = {}; // { householdId: { userId: { firstName, avatar } } }

/**
 * INITIALIZE SOCKET.IO
 */
function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  notificationRouter.setSocketServer(io);

  io.on('connection', (socket) => {
    const { householdId, userId, firstName, avatar } = socket.handshake.query;

    if (householdId && userId) {
      socket.join(`household-${householdId}`);

      if (!activeUsers[householdId]) activeUsers[householdId] = {};
      activeUsers[householdId][userId] = { firstName, avatar };

      // Broadcast update
      io.to(`household-${householdId}`).emit(
        'presence_update',
        Object.values(activeUsers[householdId])
      );

      logger.info(`[SOCKET] User ${userId} (${firstName}) connected to household-${householdId}`);
    }

    socket.on('disconnect', () => {
      if (householdId && userId && activeUsers[householdId]) {
        delete activeUsers[householdId][userId];
        io.to(`household-${householdId}`).emit(
          'presence_update',
          Object.values(activeUsers[householdId])
        );
      }
      logger.info(`[SOCKET] User ${userId} disconnected`);
    });
  });

  return io;
}

/**
 * BROADCAST TO HOUSEHOLD
 */
function notifyHousehold(householdId, event, data) {
  if (!io) return;
  io.to(`household-${householdId}`).emit(event, data);
}

module.exports = { initSocket, notifyHousehold };

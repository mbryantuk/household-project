const { Server } = require('socket.io');
const logger = require('../utils/logger').default;

let io;

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

  io.on('connection', (socket) => {
    const { householdId } = socket.handshake.query;
    if (householdId) {
      socket.join(`household-${householdId}`);
      logger.info(`[SOCKET] User connected to household-${householdId}`);
    }

    socket.on('disconnect', () => {
      logger.info('[SOCKET] User disconnected');
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

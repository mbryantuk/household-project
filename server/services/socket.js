const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const config = require('../config');
const logger = require('../utils/logger');
const notificationRouter = require('./notification_router');

let io;
let redisClient;
let subClient;

/**
 * INITIALIZE SOCKET.IO
 * Item 250: Redis Adapter for Load Balancing
 */
async function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Redis Adapter Setup
  if (config.REDIS_URL) {
    try {
      redisClient = createClient({ url: config.REDIS_URL });
      subClient = redisClient.duplicate();
      await Promise.all([redisClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(redisClient, subClient));
      logger.info('📡 Socket.io Redis adapter initialized');
    } catch (err) {
      logger.error('❌ Socket.io Redis adapter failed:', err.message);
    }
  }

  notificationRouter.setSocketServer(io);

  io.on('connection', async (socket) => {
    const { householdId, userId, firstName, avatar } = socket.handshake.query;

    if (householdId && userId) {
      socket.join(`household-${householdId}`);

      if (redisClient) {
        // Multi-instance presence tracking
        await redisClient.hSet(
          `presence:${householdId}`,
          userId,
          JSON.stringify({ firstName, avatar })
        );
        const rawUsers = await redisClient.hGetAll(`presence:${householdId}`);
        const activeUsers = Object.values(rawUsers).map((u) => JSON.parse(u));
        io.to(`household-${householdId}`).emit('presence_update', activeUsers);
      }

      logger.info(`[SOCKET] User ${userId} (${firstName}) connected to household-${householdId}`);
    }

    socket.on('disconnect', async () => {
      if (householdId && userId && redisClient) {
        await redisClient.hDel(`presence:${householdId}`, userId);
        const rawUsers = await redisClient.hGetAll(`presence:${householdId}`);
        const activeUsers = Object.values(rawUsers).map((u) => JSON.parse(u));
        io.to(`household-${householdId}`).emit('presence_update', activeUsers);
      }
      logger.info(`[SOCKET] User disconnected`);
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

/**
 * CLOSE SOCKET (Tests)
 */
async function closeSocket() {
  if (io) {
    await new Promise((resolve) => io.close(resolve));
    io = null;
  }
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (err) {}
    redisClient = null;
  }
  if (subClient) {
    try {
      await subClient.quit();
    } catch (err) {}
    subClient = null;
  }
}

module.exports = { initSocket, notifyHousehold, closeSocket };

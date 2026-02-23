const { Queue, Worker, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger').default;

const connection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

/**
 * HEARTHSTONE JOB QUEUE
 * Centralized queue for all asynchronous tasks.
 */
const mainQueue = new Queue('hearth-main', { connection });

/**
 * Add a job to the main queue.
 * @param {string} name - Action name (e.g. 'SEND_EMAIL')
 * @param {Object} data - Payload (must include householdId)
 */
async function addJob(name, data) {
  if (!data.householdId) {
    logger.warn(`[QUEUE] Adding job ${name} without householdId! Payload:`, data);
  }
  return await mainQueue.add(name, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

/**
 * INITIALIZE WORKER
 * In production, this should probably be in a separate process,
 * but for this monolith, we run it in the same process.
 */
const worker = new Worker(
  'hearth-main',
  async (job) => {
    logger.info(`[WORKER] Processing job ${job.name} (${job.id})`);

    try {
      switch (job.name) {
        case 'CLEANUP_BACKUPS': {
          const { cleanOldBackups } = require('./backup');
          await cleanOldBackups(job.data.householdId);
          break;
        }

        case 'AUDIT_LOG_PERSIST':
          // Future: Move DB persistence of audit logs here if Postgres is slow
          break;

        default:
          logger.warn(`[WORKER] Unknown job type: ${job.name}`);
      }
    } catch (err) {
      logger.error(`[WORKER] Job ${job.name} failed:`, err);
      throw err; // Allow BullMQ to handle retries
    }
  },
  { connection }
);

worker.on('completed', (job) => {
  logger.info(`[WORKER] Job ${job.name} completed successfully.`);
});

worker.on('failed', (job, err) => {
  logger.error(`[WORKER] Job ${job.name} failed permanently after retries:`, err);
});

module.exports = { addJob, mainQueue };

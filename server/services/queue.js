const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

let connection;
let mainQueue;
let worker;

function getConnection() {
  if (!connection) {
    connection = new IORedis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

/**
 * HEARTHSTONE JOB QUEUE
 * Centralized queue for all asynchronous tasks.
 */
function getMainQueue() {
  if (!mainQueue) {
    mainQueue = new Queue('hearth-main', { connection: getConnection() });
  }
  return mainQueue;
}

/**
 * Add a job to the main queue.
 * @param {string} name - Action name (e.g. 'SEND_EMAIL')
 * @param {Object} data - Payload (must include householdId)
 */
async function addJob(name, data) {
  if (!data.householdId) {
    logger.warn(`[QUEUE] Adding job ${name} without householdId! Payload:`, data);
  }
  return await getMainQueue().add(name, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

/**
 * INITIALIZE WORKER
 * In production, this should probably be in a separate process,
 * but for this monolith, we run it in the same process.
 */
function initWorker() {
  if (worker) return worker;

  worker = new Worker(
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

          case 'WEBHOOK_PROCESS': {
            const { provider, payload, householdId } = job.data;
            logger.info(`[WORKER] Processing webhook from ${provider} for HH:${householdId}`);
            // Logic for specific providers (e.g. Stripe, GoCardless, etc.)
            break;
          }

          case 'WEBHOOK_DELIVERY': {
            const { deliverWebhook } = require('./webhook_dispatcher');
            const { url, secret, eventName, payload } = job.data;
            await deliverWebhook(url, secret, eventName, payload);
            break;
          }

          case 'REFRESH_MATERIALIZED_VIEWS': {
            const { db } = require('../db/index');
            const { sql } = require('drizzle-orm');
            logger.info('[WORKER] Refreshing Materialized Views...');
            await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY audit_log_stats`);
            break;
          }

          case 'AUDIT_LOG_PERSIST':
            // Future: Move DB persistence of audit logs here if Postgres is slow
            break;

          case 'FINANCE_OVERDRAFT_CHECK': {
            const { checkUpcomingOverdrafts } = require('./finance_alerts');
            await checkUpcomingOverdrafts(job.data.householdId);
            break;
          }

          case 'S3_BACKUP': {
            const { backupToS3 } = require('./s3_backup');
            await backupToS3(job.data.householdId);
            break;
          }

          case 'SEND_EMAIL': {
            const { subject, text, to, userId, householdId } = job.data;
            let targetEmail = to;

            if (!targetEmail && userId) {
              const { db } = require('../db/index');
              const { users } = require('../db/schema');
              const { eq } = require('drizzle-orm');
              const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
              if (user) targetEmail = user.email;
            }

            if (!targetEmail) {
              logger.error(`[WORKER] Cannot send email ${job.id}: No target email or userId`);
              break;
            }

            logger.info(`📧 [EMAIL] To: ${targetEmail} | Subject: ${subject}`);
            logger.debug(`[EMAIL] Body: ${text}`);

            // Real implementation would use nodemailer or an API (SendGrid, Postmark)
            // For now, we simulate success
            break;
          }

          default:
            logger.warn(`[WORKER] Unknown job type: ${job.name}`);
        }
      } catch (err) {
        logger.error(`[WORKER] Job ${job.name} failed:`, err);
        throw err; // Allow BullMQ to handle retries
      }
    },
    { connection: getConnection() }
  );

  worker.on('completed', (job) => {
    logger.info(`[WORKER] Job ${job.name} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[WORKER] Job ${job.name} failed permanently after retries:`, err);
  });

  return worker;
}

// Automatically start worker unless in test environment or explicitly disabled
if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_WORKER !== 'true') {
  initWorker();
}

async function closeAll() {
  if (worker) await worker.close();
  if (mainQueue) await mainQueue.close();
  if (connection) await connection.quit();
  worker = null;
  mainQueue = null;
  connection = null;
}

module.exports = { addJob, getMainQueue, initWorker, closeAll };

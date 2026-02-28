const { monitorEventLoopDelay } = require('perf_hooks');
const logger = require('../utils/logger');
const { addJob } = require('./queue');

/**
 * HEALTH MONITOR SERVICE
 * Item 227: Heartbeat & Event Loop Latency Monitoring
 */

const histogram = monitorEventLoopDelay({ resolution: 10 });
histogram.enable();

let lastAlertTime = 0;
const ALERT_THRESHOLD_MS = 200;
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
let monitorInterval = null;

function startHeartbeatMonitor() {
  if (monitorInterval) return;
  monitorInterval = setInterval(() => {
    const lag = histogram.mean / 1e6; // Convert to ms
    histogram.reset();

    if (lag > ALERT_THRESHOLD_MS) {
      const now = Date.now();
      if (now - lastAlertTime > ALERT_COOLDOWN_MS) {
        logger.error(`[HEALTH-MONITOR] High Event Loop Lag Detected: ${lag.toFixed(2)}ms`);

        // Dispatch alert job
        addJob('SEND_EMAIL', {
          householdId: 0,
          subject: 'Hearthstone: System Performance Alert',
          text: `Event loop lag reached ${lag.toFixed(2)}ms. System might be under high load or leaking memory.`,
        }).catch((err) => logger.error(`[HEALTH-MONITOR] Failed to dispatch alert job:`, err));

        lastAlertTime = now;
      }
    } else {
      logger.debug(`[HEALTH-MONITOR] Heartbeat OK. Lag: ${lag.toFixed(2)}ms`);
    }
  }, 10000); // Check every 10 seconds
}

function stopHeartbeatMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

module.exports = { startHeartbeatMonitor, stopHeartbeatMonitor };

import fs from 'fs';
import path from 'path';

const LOG_FILE = '/tmp/brady_lifecycle.log';
const stepStartTimes = new Map();

export const logStep = (stepName, message = '') => {
    const now = new Date();
    const timestamp = now.toISOString();
    let durationStr = '';

    if (message.startsWith('Starting...')) {
        stepStartTimes.set(stepName, now.getTime());
    } else if (message.includes('Completed') || message.includes('FAILED') || message.includes('ERROR')) {
        const startTime = stepStartTimes.get(stepName);
        if (startTime) {
            const duration = ((now.getTime() - startTime) / 1000).toFixed(2);
            durationStr = ` [${duration}s]`;
            // don't delete yet if we have nested logs, but usually start/complete are pairs
        }
    }

    const logEntry = `[${timestamp}] [STEP: ${stepName}]${durationStr} ${message}\n`;
    fs.appendFileSync(LOG_FILE, logEntry);
    console.log(logEntry.trim());
};

export const startTestRun = () => {
    const runId = `RUN_${Date.now()}`;
    fs.writeFileSync(LOG_FILE, `=== NEW TEST RUN: ${runId} ===\n`);
    return runId;
};

/**
 * Custom timeout wrapper for a step
 */
export const withTimeout = async (stepName, fn, timeoutMs = 60000) => {
    logStep(stepName, 'Starting...');
    
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            const err = `Failed - Timeout: Step "${stepName}" exceeded ${timeoutMs/1000}s without progressing.`;
            logStep(stepName, `ERROR: ${err}`);
            reject(new Error(err));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([fn(), timeoutPromise]);
        clearTimeout(timeoutId);
        logStep(stepName, 'Completed successfully.');
        return result;
    } catch (error) {
        clearTimeout(timeoutId);
        logStep(stepName, `FAILED: ${error.message}`);
        throw error;
    }
};

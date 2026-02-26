const fs = require('fs');
const path = require('path');
const { createBackup, BACKUP_DIR } = require('./backup');
const { uploadFile } = require('./storage');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * S3 BACKUP SERVICE
 * Item 225: Nightly snapshots to S3
 */

async function backupToS3(householdId = null) {
  logger.info(
    `[S3-BACKUP] Starting backup for ${householdId ? 'HH:' + householdId : 'Full System'}`
  );

  try {
    // 1. Create local zip
    const manifest = {
      source: 'Scheduled S3 Backup',
      timestamp: new Date().toISOString(),
      householdId,
    };
    const filename = await createBackup(householdId, manifest);
    const filePath = path.join(BACKUP_DIR, filename);

    // 2. Read file
    const body = fs.readFileSync(filePath);

    // 3. Upload to S3
    // If householdId is null, we'll use a special system bucket prefix
    const s3Id = householdId || 0;
    const s3Key = await uploadFile(s3Id, `backups/${filename}`, body, 'application/zip');

    logger.info(`[S3-BACKUP] Successfully uploaded to S3: ${s3Key}`);

    // 4. Cleanup local file if configured
    if (config.CLEANUP_LOCAL_BACKUPS_AFTER_S3) {
      fs.unlinkSync(filePath);
      logger.info(`[S3-BACKUP] Deleted local file: ${filename}`);
    }

    return s3Key;
  } catch (err) {
    logger.error(`[S3-BACKUP] Failed:`, err);
    throw err;
  }
}

module.exports = { backupToS3 };

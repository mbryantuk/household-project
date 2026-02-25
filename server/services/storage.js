const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

let s3Client = null;

if (config.STORAGE_DRIVER === 's3') {
  s3Client = new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY,
      secretAccessKey: config.S3_SECRET_KEY,
    },
    forcePathStyle: true, // Needed for many S3-compatible providers like Minio
  });
}

/**
 * UPLOAD FILE
 * @param {number} householdId
 * @param {string} fileName
 * @param {Buffer|Stream} body
 * @param {string} contentType
 */
async function uploadFile(householdId, fileName, body, contentType) {
  const key = `household-${householdId}/${fileName}`;

  if (config.STORAGE_DRIVER === 's3') {
    try {
      const command = new PutObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      });
      await s3Client.send(command);
      return key;
    } catch (err) {
      logger.error(`[STORAGE] S3 Upload failed for ${key}:`, err);
      throw err;
    }
  } else {
    // Local Storage
    const fullPath = path.join(__dirname, '..', config.UPLOAD_DIR, key);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(fullPath, body);
    return key;
  }
}

/**
 * DELETE FILE
 */
async function deleteFile(key) {
  if (config.STORAGE_DRIVER === 's3') {
    try {
      const command = new DeleteObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
      });
      await s3Client.send(command);
    } catch (err) {
      logger.error(`[STORAGE] S3 Delete failed for ${key}:`, err);
    }
  } else {
    const fullPath = path.join(__dirname, '..', config.UPLOAD_DIR, key);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }
}

/**
 * GET FILE PATH (for local) or URL (for S3)
 */
function getFileLocation(key) {
  if (config.STORAGE_DRIVER === 's3') {
    // Return a signed URL or public URL depending on bucket config
    return `${config.S3_ENDPOINT}/${config.S3_BUCKET}/${key}`;
  } else {
    return path.join(__dirname, '..', config.UPLOAD_DIR, key);
  }
}

module.exports = { uploadFile, deleteFile, getFileLocation };

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Key storage (Persist key across restarts)
const KEY_PATH = path.join(__dirname, '../data/.secret.key');

let MASTER_KEY;

// Initialize Key
if (fs.existsSync(KEY_PATH)) {
  MASTER_KEY = fs.readFileSync(KEY_PATH);
} else {
  // Generate new 32-byte key for AES-256
  MASTER_KEY = crypto.randomBytes(32);
  // Ensure data directory exists
  const dataDir = path.dirname(KEY_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(KEY_PATH, MASTER_KEY);
  console.log('🔐 Generated new encryption master key.');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // AES block size

/**
 * Encrypt a text value
 * @param {string} text
 * @returns {string} iv:authTag:encryptedContent
 */
function encrypt(text) {
  if (!text) return text;
  if (typeof text !== 'string') text = String(text);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:content
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a text value
 * @param {string} text - iv:authTag:encryptedContent
 * @returns {string} Original text
 */
function decrypt(text) {
  if (!text) return text;
  if (!text.includes(':')) return text; // Not encrypted or legacy data

  try {
    const parts = text.split(':');
    if (parts.length !== 3) return text; // Invalid format

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    // console.error("Decryption failed:", err.message);
    // Fail safe: return original text (might be plain text if key changed or data corrupt)
    return text;
  }
}

/**
 * Check if a string appears to be encrypted
 */
function isEncrypted(text) {
  if (!text || typeof text !== 'string') return false;
  return text.split(':').length === 3;
}

module.exports = { encrypt, decrypt, isEncrypted };

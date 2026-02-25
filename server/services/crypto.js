const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Item 126: KMS Integration (Abstracted)
 * Standardizes field-level encryption for PII.
 */
class CryptoService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.key = crypto.scryptSync(config.SECRET_KEY, 'salt', 32);
    
    // Bind methods to preserve 'this' context when destructured
    this.encrypt = this.encrypt.bind(this);
    this.decrypt = this.decrypt.bind(this);
    this.isEncrypted = this.isEncrypted.bind(this);
  }

  /**
   * Encrypt a value
   */
  encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(String(text));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  /**
   * Decrypt a value
   */
  decrypt(text) {
    if (!text) return null;
    try {
      const textParts = text.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');
      const decipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (err) {
      logger.error('[CRYPTO] Decryption failed:', err.message);
      return null;
    }
  }

  /**
   * Helper to check if a value is encrypted
   */
  isEncrypted(text) {
    if (typeof text !== 'string') return false;
    const parts = text.split(':');
    return parts.length === 2 && parts[0].length === 32;
  }
}

module.exports = new CryptoService();

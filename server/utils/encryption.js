const crypto = require('crypto');
const { SECRET_KEY } = require('../config');

// Ensure key is 32 bytes
const algorithm = 'aes-256-cbc';
const key = crypto.createHash('sha256').update(String(SECRET_KEY)).digest();

function encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!text) return null;
    const textParts = text.split(':');
    
    // Legacy plaintext support (OTPLE secrets are Base32, no colons usually)
    if (textParts.length < 2) return text; 

    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    
    try {
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (err) {
        // If decryption fails, it might be a false positive on the colon check or corrupted
        console.warn("Decryption failed, falling back to original text (legacy check).");
        return text;
    }
}

module.exports = { encrypt, decrypt };

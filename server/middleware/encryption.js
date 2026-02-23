const { encrypt, decrypt, isEncrypted } = require('../services/crypto');

/**
 * Map of tables and fields that should be encrypted at rest.
 */
const ENCRYPTED_FIELDS = {
  members: ['dob', 'will_details', 'life_insurance_provider'],
  vehicles: ['registration'],
  assets: ['serial_number'],
  house_details: ['wifi_password', 'emergency_contacts', 'broadband_account'],
  finance_savings: ['account_number'],
  finance_current_accounts: ['account_number', 'sort_code'],
  finance_credit_cards: ['account_number'],
  finance_pensions: ['account_number'],
  recurring_costs: ['metadata'], // JSON blob containing sensitive info
};

/**
 * Sensitive keys that might exist inside JSON metadata blobs.
 */
const SENSITIVE_JSON_KEYS = [
  'account_number',
  'policy_number',
  'sort_code',
  'registration',
  'serial_number',
  'wifi_password',
];

/**
 * Recursively encrypt/decrypt sensitive keys in an object.
 */
const processDeep = (obj, isEncrypt = true) => {
  if (!obj || typeof obj !== 'object') return obj;
  const newObj = Array.isArray(obj) ? [] : {};

  Object.keys(obj).forEach((key) => {
    let value = obj[key];
    if (SENSITIVE_JSON_KEYS.includes(key) && value) {
      if (isEncrypt && !isEncrypted(value)) {
        newObj[key] = encrypt(String(value));
      } else if (!isEncrypt && isEncrypted(value)) {
        newObj[key] = decrypt(value);
      } else {
        newObj[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      newObj[key] = processDeep(value, isEncrypt);
    } else {
      newObj[key] = value;
    }
  });
  return newObj;
};

/**
 * Middleware to handle field-level encryption for incoming payloads.
 * Should be used before DB insert/update.
 * @param {string} tableName
 */
const autoEncrypt = (tableName) => (req, res, next) => {
  const fields = ENCRYPTED_FIELDS[tableName];
  if (!fields || !req.body) return next();

  fields.forEach((field) => {
    const value = req.body[field];
    if (!value) return;

    if (field === 'metadata') {
      // Special handling for metadata JSON
      let data = typeof value === 'string' ? JSON.parse(value) : value;
      data = processDeep(data, true);
      req.body[field] = JSON.stringify(data);
    } else if (!isEncrypted(value)) {
      req.body[field] = encrypt(String(value));
    }
  });
  next();
};

/**
 * Helper to decrypt an object based on its table mapping.
 */
const decryptData = (tableName, data) => {
  const fields = ENCRYPTED_FIELDS[tableName];
  if (!fields || !data) return data;

  const processItem = (item) => {
    const newItem = { ...item };
    fields.forEach((field) => {
      const value = newItem[field];
      if (!value) return;

      if (field === 'metadata') {
        try {
          let data = typeof value === 'string' ? JSON.parse(value) : value;
          data = processDeep(data, false);
          newItem[field] = typeof value === 'string' ? JSON.stringify(data) : data;
        } catch (e) {
          // Keep original if parsing fails
        }
      } else if (isEncrypted(value)) {
        newItem[field] = decrypt(value);
      }
    });
    return newItem;
  };

  if (Array.isArray(data)) {
    return data.map(processItem);
  }
  return processItem(data);
};

module.exports = { ENCRYPTED_FIELDS, autoEncrypt, decryptData, processDeep };

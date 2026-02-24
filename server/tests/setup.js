const { TextEncoder, TextDecoder } = require('util');

// Node.js 22 has these globally, but Jest's VM context might not expose them to dependencies
// that check for them on `global` or `window`.
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Mock the config module globally for tests to prevent "module not found" or "secrets not loaded" errors
jest.mock('../config', () => ({
  PORT: 4001,
  DATABASE_URL: 'postgres://hearth_user:hearth_password@127.0.0.1:5432/hearthstone_test',
  REDIS_URL: 'redis://localhost:6379',
  SECRET_KEY: 'super_secret_test_key_long_enough',
  ALLOWED_ORIGINS: '*',
  STORAGE_DRIVER: 'local',
  UPLOAD_DIR: 'data/uploads',
  loadSecrets: jest.fn().mockResolvedValue({
    PORT: 4001,
    DATABASE_URL: 'postgres://hearth_user:hearth_password@127.0.0.1:5432/hearthstone_test',
    REDIS_URL: 'redis://localhost:6379',
    SECRET_KEY: 'super_secret_test_key_long_enough',
  }),
}));

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://hearth_user:hearth_password@127.0.0.1:5432/hearthstone';

jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn(() => 'KVKFKRJTJ5YFMND7'),
    keyuri: jest.fn(
      () => 'otpauth://totp/Totem:test@test.com?secret=KVKFKRJTJ5YFMND7&issuer=Totem'
    ),
    verify: jest.fn(() => true),
  },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,fake-qr-code')),
}));

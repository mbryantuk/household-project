module.exports = {
  testEnvironment: 'node',
  maxWorkers: 1, // Fix SQLITE_BUSY during parallel tests by running suites sequentially
  moduleNameMapper: {
    '@scalar/express-api-reference': '<rootDir>/tests/scalar-mock.js',
  },
  setupFiles: ['<rootDir>/tests/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupAfterEnv.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  transformIgnorePatterns: ['/node_modules/(?!(@scure|otplib|qrcode|ua-parser-js)/)'],
  globalTeardown: '<rootDir>/tests/teardown.js',
  reporters: ['default', '<rootDir>/tests/json-reporter.js'],
};

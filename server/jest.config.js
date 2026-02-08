module.exports = {
  testEnvironment: 'node',
  maxWorkers: 1, // Fix SQLITE_BUSY during parallel tests by running suites sequentially
  moduleNameMapper: {
    '@scalar/express-api-reference': '<rootDir>/tests/scalar-mock.js'
  },
  setupFiles: ['<rootDir>/tests/setup.js'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!.*(@scure|otplib|qrcode|ua-parser-js|@noble))'
  ],
  globalTeardown: '<rootDir>/tests/teardown.js',
  reporters: [
    'default',
    '<rootDir>/tests/json-reporter.js'
  ]
};
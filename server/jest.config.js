module.exports = {
  testEnvironment: 'node',
  maxWorkers: 1, // Fix SQLITE_BUSY during parallel tests by running suites sequentially
  moduleNameMapper: {
    '@scalar/express-api-reference': '<rootDir>/tests/scalar-mock.js'
  },
  globalTeardown: '<rootDir>/tests/teardown.js'
};
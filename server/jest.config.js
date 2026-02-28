module.exports = {
  testEnvironment: 'node',
  maxWorkers: 1, // Fix SQLITE_BUSY during parallel tests by running suites sequentially
  moduleNameMapper: {
    '@scalar/express-api-reference': '<rootDir>/tests/scalar-mock.js',
  },
  globalSetup: '<rootDir>/tests/globalSetup.js',
  setupFiles: ['<rootDir>/tests/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupAfterEnv.js'],
  globals: {
    TextEncoder: require('util').TextEncoder,
    TextDecoder: require('util').TextDecoder,
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  transformIgnorePatterns: ['/node_modules/(?!(@scure|otplib|qrcode|ua-parser-js)/)'],
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  forceExit: true,
  reporters: ['default', '<rootDir>/tests/json-reporter.js'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/', '/scripts/'],
};

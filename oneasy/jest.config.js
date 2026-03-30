/** @type {import('jest').Config} */
module.exports = {
  testMatch: ['<rootDir>/backend/__tests__/**/*.test.js'],
  testEnvironment: 'node',
  // Suppress console noise during tests
  silent: false,
  verbose: true,
  // Set env vars for test runs
  testTimeout: 10000,
};

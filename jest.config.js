/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  transform: {},
  transformIgnorePatterns: [
    "/node_modules/"
  ],
  collectCoverageFrom: [
    "src/**/*.js",
    "!**/node_modules/**"
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testMatch: [
    "**/tests/**/*.test.js"
  ],
  setupFilesAfterEnv: [
    "<rootDir>/tests/setup.js"
  ],
  // Add support for ES modules in Jest
  // extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};

export default config;

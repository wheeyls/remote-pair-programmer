export default {
  testEnvironment: "node",
  transform: {},
  extensionsToTreatAsEsm": [".js"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
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
  ]
};

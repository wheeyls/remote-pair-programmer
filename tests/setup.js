// Mock console methods to avoid cluttering test output
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock child_process.execSync
jest.mock('child_process', () => ({
  execSync: jest.fn().mockImplementation(() => 'mocked execSync output')
}));

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockImplementation((path) => `Mock content for ${path}`),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

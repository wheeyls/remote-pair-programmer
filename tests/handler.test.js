const AIClient = require('../src/aiClient');
const Queue = require('../src/utils/queue');

// Mock the command modules
jest.mock('../src/commands/processPullRequest', () => jest.fn());
jest.mock('../src/commands/processComment', () => jest.fn());
jest.mock('../src/commands/processIssue', () => jest.fn());

// Mock the AIClient
jest.mock('../src/aiClient', () => {
  return jest.fn().mockImplementation(() => {
    return {
      generateCompletion: jest.fn().mockResolvedValue('Test response')
    };
  });
});

// Mock the Queue
jest.mock('../src/utils/queue', () => {
  return jest.fn().mockImplementation(() => {
    return {
      registerHandler: jest.fn(),
      enqueue: jest.fn().mockResolvedValue({})
    };
  });
});

describe('Handler', () => {
  let originalEnv;
  let processPullRequest;
  let processComment;
  let processIssue;
  
  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Reset modules before each test
    jest.resetModules();
    
    // Set up environment variables for testing
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_API_KEY = 'test-api-key';
    process.env.AI_MODEL = 'gpt-4';
    process.env.TRIGGER_PHRASE = '@test-bot';
    
    // Get the mocked modules
    processPullRequest = require('../src/commands/processPullRequest');
    processComment = require('../src/commands/processComment');
    processIssue = require('../src/commands/processIssue');
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  test('initializes AIClient with correct parameters', () => {
    // Execute the handler
    jest.isolateModules(() => {
      require('../src/handler');
    });
    
    // Check if AIClient was initialized correctly
    expect(AIClient).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
      model: 'gpt-4',
      strongModel: undefined,
      weakModel: undefined,
      provider: 'openai'
    });
  });
  
  test('initializes Queue with correct parameters', () => {
    // Execute the handler
    jest.isolateModules(() => {
      require('../src/handler');
    });
    
    // Check if Queue was initialized correctly
    expect(Queue).toHaveBeenCalledWith({
      name: 'github-ai-agent'
    });
  });
  
  test('registers all command handlers', () => {
    // Execute the handler
    jest.isolateModules(() => {
      const handler = require('../src/handler');
    });
    
    // Get the Queue instance
    const queueInstance = Queue.mock.instances[0];
    
    // Check if all handlers were registered
    expect(queueInstance.registerHandler).toHaveBeenCalledTimes(3);
    expect(queueInstance.registerHandler).toHaveBeenCalledWith('process-pr', expect.any(Function));
    expect(queueInstance.registerHandler).toHaveBeenCalledWith('process-comment', expect.any(Function));
    expect(queueInstance.registerHandler).toHaveBeenCalledWith('process-issue', expect.any(Function));
  });
  
  test('processes pull request command correctly', async () => {
    // Mock process.argv
    const originalArgv = process.argv;
    process.argv = ['node', 'src/handler.js', 'process-pr'];
    
    // Execute the handler
    jest.isolateModules(() => {
      require('../src/handler');
    });
    
    // Get the Queue instance
    const queueInstance = Queue.mock.instances[0];
    
    // Check if the correct command was enqueued
    expect(queueInstance.enqueue).toHaveBeenCalledWith('process-pr', {});
    
    // Restore process.argv
    process.argv = originalArgv;
  });
  
  test('processes comment command correctly', async () => {
    // Mock process.argv
    const originalArgv = process.argv;
    process.argv = ['node', 'src/handler.js', 'process-comment'];
    
    // Execute the handler
    jest.isolateModules(() => {
      require('../src/handler');
    });
    
    // Get the Queue instance
    const queueInstance = Queue.mock.instances[0];
    
    // Check if the correct command was enqueued
    expect(queueInstance.enqueue).toHaveBeenCalledWith('process-comment', {});
    
    // Restore process.argv
    process.argv = originalArgv;
  });
  
  test('processes issue command correctly', async () => {
    // Mock process.argv
    const originalArgv = process.argv;
    process.argv = ['node', 'src/handler.js', 'process-issue'];
    
    // Execute the handler
    jest.isolateModules(() => {
      require('../src/handler');
    });
    
    // Get the Queue instance
    const queueInstance = Queue.mock.instances[0];
    
    // Check if the correct command was enqueued
    expect(queueInstance.enqueue).toHaveBeenCalledWith('process-issue', {});
    
    // Restore process.argv
    process.argv = originalArgv;
  });
  
  test('exits with error for invalid command', () => {
    // Mock process.argv and process.exit
    const originalArgv = process.argv;
    const originalExit = process.exit;
    process.argv = ['node', 'src/handler.js', 'invalid-command'];
    process.exit = jest.fn();
    
    // Mock console.error
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    // Execute the handler
    jest.isolateModules(() => {
      require('../src/handler');
    });
    
    // Check if error was logged and process.exit was called
    expect(console.error).toHaveBeenCalledWith('Invalid command. Use: process-pr, process-comment, or process-issue');
    expect(process.exit).toHaveBeenCalledWith(1);
    
    // Restore mocks
    process.argv = originalArgv;
    process.exit = originalExit;
    console.error = originalConsoleError;
  });
});

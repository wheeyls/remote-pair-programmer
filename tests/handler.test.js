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
  let handler;
  let mockAIClientInstance;
  let mockQueueInstance;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Save original environment
    originalEnv = { ...process.env };
    
    // Reset modules before each test
    jest.resetModules();
    
    // Set up environment variables for testing
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_API_KEY = 'test-api-key';
    process.env.AI_MODEL = 'gpt-4';
    process.env.TRIGGER_PHRASE = '@test-bot';
    
    // Create mock instances that we can reference in tests
    mockAIClientInstance = {
      generateCompletion: jest.fn().mockResolvedValue('Test response')
    };
    
    mockQueueInstance = {
      registerHandler: jest.fn(),
      enqueue: jest.fn().mockResolvedValue({})
    };
    
    // Override the constructor implementations to use our instances
    AIClient.mockImplementation(() => mockAIClientInstance);
    Queue.mockImplementation(() => mockQueueInstance);
    
    // Get the mocked modules
    processPullRequest = require('../src/commands/processPullRequest');
    processComment = require('../src/commands/processComment');
    processIssue = require('../src/commands/processIssue');
    
    // Import the handler module
    handler = require('../src/handler');
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });
  
  test('initializes AIClient with correct parameters', () => {
    // Initialize the handler
    handler.initializeHandler();
    
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
    // Initialize the handler
    handler.initializeHandler();
    
    // Check if Queue was initialized correctly
    expect(Queue).toHaveBeenCalledWith({
      name: 'github-ai-agent'
    });
  });
  
  test('registers all command handlers', () => {
    // Initialize the handler
    handler.initializeHandler();
    
    // Check if all handlers were registered
    expect(mockQueueInstance.registerHandler).toHaveBeenCalledTimes(3);
    expect(mockQueueInstance.registerHandler).toHaveBeenCalledWith('process-pr', expect.any(Function));
    expect(mockQueueInstance.registerHandler).toHaveBeenCalledWith('process-comment', expect.any(Function));
    expect(mockQueueInstance.registerHandler).toHaveBeenCalledWith('process-issue', expect.any(Function));
  });
  
  test('processes pull request command correctly', async () => {
    // Run the handler with the PR command
    await handler.runHandler('process-pr');
    
    // Check if the correct command was enqueued
    expect(mockQueueInstance.enqueue).toHaveBeenCalledWith('process-pr', {});
  });
  
  test('processes comment command correctly', async () => {
    // Run the handler with the comment command
    await handler.runHandler('process-comment');
    
    // Check if the correct command was enqueued
    expect(mockQueueInstance.enqueue).toHaveBeenCalledWith('process-comment', {});
  });
  
  test('processes issue command correctly', async () => {
    // Run the handler with the issue command
    await handler.runHandler('process-issue');
    
    // Check if the correct command was enqueued
    expect(mockQueueInstance.enqueue).toHaveBeenCalledWith('process-issue', {});
  });
  
  test('exits with error for invalid command', () => {
    // Mock process.exit
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    
    // Mock console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Run the handler with an invalid command
    handler.runHandler('invalid-command');
    
    // Check if error was logged and process.exit was called
    expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid command. Use: process-pr, process-comment, or process-issue');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    // Restore mocks
    mockExit.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});

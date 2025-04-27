// Mock the command modules
jest.mock('../src/commands/processPullRequest.js', () => ({ default: jest.fn() }));
jest.mock('../src/commands/processComment.js', () => ({ default: jest.fn() }));
jest.mock('../src/commands/processIssue.js', () => ({ default: jest.fn() }));
jest.mock('../src/commands/processReviewComment.js', () => ({ default: jest.fn() }));

describe('Handler', () => {
  let originalEnv;
  let processPullRequest;
  let processComment;
  let processIssue;
  let handler;
  let mockAIClient;
  let mockQueue;
  
  beforeEach(async () => {
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
    
    // Create mock instances directly
    mockAIClient = {
      generateCompletion: jest.fn().mockResolvedValue('Test response')
    };
    
    mockQueue = {
      registerHandler: jest.fn(),
      enqueue: jest.fn().mockResolvedValue({})
    };
    
    // Get the mocked modules
    const pullRequestModule = await import('../src/commands/processPullRequest.js');
    const commentModule = await import('../src/commands/processComment.js');
    const issueModule = await import('../src/commands/processIssue.js');
    
    processPullRequest = pullRequestModule.default;
    processComment = commentModule.default;
    processIssue = issueModule.default;
    
    // Import the handler module
    handler = await import('../src/handler.js');
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });
  
  test('registers all command handlers', () => {
    // Initialize the handler with our mocks
    handler.initializeHandler({
      aiClient: mockAIClient,
      queue: mockQueue
    });
    
    // Check if all handlers were registered
    expect(mockQueue.registerHandler).toHaveBeenCalledTimes(4);
    expect(mockQueue.registerHandler).toHaveBeenCalledWith('process-pr', expect.any(Function));
    expect(mockQueue.registerHandler).toHaveBeenCalledWith('process-comment', expect.any(Function));
    expect(mockQueue.registerHandler).toHaveBeenCalledWith('process-issue', expect.any(Function));
    expect(mockQueue.registerHandler).toHaveBeenCalledWith('process-review-comment', expect.any(Function));
  });
  
  test('processes pull request command correctly', async () => {
    // Run the handler with the PR command and our mocks
    await handler.runHandler('process-pr', {
      aiClient: mockAIClient,
      queue: mockQueue
    });
    
    // Check if the correct command was enqueued
    expect(mockQueue.enqueue).toHaveBeenCalledWith('process-pr', {});
  });
  
  test('processes comment command correctly', async () => {
    // Run the handler with the comment command and our mocks
    await handler.runHandler('process-comment', {
      aiClient: mockAIClient,
      queue: mockQueue
    });
    
    // Check if the correct command was enqueued
    expect(mockQueue.enqueue).toHaveBeenCalledWith('process-comment', {});
  });
  
  test('processes issue command correctly', async () => {
    // Run the handler with the issue command and our mocks
    await handler.runHandler('process-issue', {
      aiClient: mockAIClient,
      queue: mockQueue
    });
    
    // Check if the correct command was enqueued
    expect(mockQueue.enqueue).toHaveBeenCalledWith('process-issue', {});
  });
  
  test('processes review comment command correctly', async () => {
    // Run the handler with the review comment command and our mocks
    await handler.runHandler('process-review-comment', {
      aiClient: mockAIClient,
      queue: mockQueue
    });
    
    // Check if the correct command was enqueued
    expect(mockQueue.enqueue).toHaveBeenCalledWith('process-review-comment', {});
  });
  
  test('exits with error for invalid command', async () => {
    // Mock process.exit
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    
    // Mock console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Run the handler with an invalid command and our mocks
    await handler.runHandler('invalid-command', {
      aiClient: mockAIClient,
      queue: mockQueue
    });
    
    // Check if error was logged and process.exit was called
    expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid command. Use: process-pr, process-comment, process-issue, or process-review-comment');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    // Restore mocks
    mockExit.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});

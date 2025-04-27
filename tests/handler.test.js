import { jest } from '@jest/globals';
import { initializeHandler, runHandler } from '../src/handler.js';
import { createQueue } from '../src/utils/queueFactory.js';

// Mock the queue factory
jest.mock('../src/utils/queueFactory.js');

describe('Handler', () => {
  let originalEnv;
  let mockAIClient;
  let mockQueue;
  
  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Set up environment variables for testing
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_API_KEY = 'test-api-key';
    process.env.AI_MODEL = 'gpt-4';
    process.env.TRIGGER_PHRASE = '@test-bot';
    
    // Create mock instances for dependency injection
    mockAIClient = {
      generateCompletion: jest.fn().mockResolvedValue('Test response')
    };
    
    mockQueue = {
      registerHandler: jest.fn(),
      enqueue: jest.fn().mockResolvedValue({})
    };
    
    // Mock the createQueue function to return our mock queue
    createQueue.mockReturnValue(mockQueue);
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });
  
  test('registers all command handlers', () => {
    // Initialize the handler with our mocks
    initializeHandler({
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
    await runHandler('process-pr', {
      aiClient: mockAIClient,
      queue: mockQueue
    });
    
    // Check if the correct command was enqueued
    expect(mockQueue.enqueue).toHaveBeenCalledWith('process-pr', {});
  });
  
  test('processes comment command correctly', async () => {
    // Run the handler with the comment command and our mocks
    await runHandler('process-comment', {
      aiClient: mockAIClient,
      queue: mockQueue
    });
    
    // Check if the correct command was enqueued
    expect(mockQueue.enqueue).toHaveBeenCalledWith('process-comment', {});
  });
  
  test('processes issue command correctly', async () => {
    // Run the handler with the issue command and our mocks
    await runHandler('process-issue', {
      aiClient: mockAIClient,
      queue: mockQueue
    });
    
    // Check if the correct command was enqueued
    expect(mockQueue.enqueue).toHaveBeenCalledWith('process-issue', {});
  });
  
  test('processes review comment command correctly', async () => {
    // Run the handler with the review comment command and our mocks
    await runHandler('process-review-comment', {
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
    await runHandler('invalid-command', {
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

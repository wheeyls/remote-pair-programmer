import { jest } from '@jest/globals';
import { initializeWorker } from '../src/index.js';

describe('Worker', () => {
  let mockAIClient;
  let mockQueue;
  let config;

  beforeEach(() => {
    // Create mock AI client for dependency injection
    mockAIClient = {
      generateCompletion: jest.fn().mockResolvedValue('Test response'),
    };

    // Create mock queue for dependency injection
    mockQueue = {
      name: 'test-queue',
      registerHandler: jest.fn(),
    };

    // Create test config
    config = {
      ai: {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        strongModel: 'gpt-4',
        weakModel: 'gpt-3.5-turbo',
      },
      queue: {
        serviceUrl: 'http://localhost:3000',
        authToken: 'test-token',
      },
      bot: {
        triggerPhrase: '@test-bot',
      },
    };
  });

  test('initializes worker with correct dependencies', () => {
    // Initialize the worker with mocked dependencies
    const result = initializeWorker({
      aiClient: mockAIClient,
      queue: mockQueue,
      config: config,
    });

    // Check if the worker was initialized correctly
    expect(result.aiClient).toBe(mockAIClient);
    expect(result.queue).toBe(mockQueue);
    expect(result.TRIGGER_PHRASE).toBe('@test-bot');
  });

  test('registers all command handlers', () => {
    // Initialize the worker with mocked dependencies
    initializeWorker({
      aiClient: mockAIClient,
      queue: mockQueue,
      config: config,
    });

    // Check if all handlers were registered
    expect(mockQueue.registerHandler).toHaveBeenCalledTimes(6);
    expect(mockQueue.registerHandler).toHaveBeenCalledWith('process-pr', expect.any(Function));
    expect(mockQueue.registerHandler).toHaveBeenCalledWith('process-comment', expect.any(Function));
    expect(mockQueue.registerHandler).toHaveBeenCalledWith('process-issue', expect.any(Function));
    expect(mockQueue.registerHandler).toHaveBeenCalledWith('process-issue-comment', expect.any(Function));
    expect(mockQueue.registerHandler).toHaveBeenCalledWith('process-review-comment', expect.any(Function));
    expect(mockQueue.registerHandler).toHaveBeenCalledWith('process-revert', expect.any(Function));
  });
});

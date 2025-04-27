const Queue = require('../src/utils/queue');

// Mock Redis client
jest.mock('redis', () => {
  const mockClient = {
    connect: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    lPush: jest.fn().mockResolvedValue(1),
    rPop: jest.fn().mockResolvedValue(null),
    hSet: jest.fn().mockResolvedValue(true),
    quit: jest.fn().mockResolvedValue(true)
  };
  
  return {
    createClient: jest.fn().mockReturnValue(mockClient)
  };
});

const redis = require('redis');

describe('Queue', () => {
  let queue;
  let mockRedisClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variable for tests
    process.env.REDIS_URL = 'redis://localhost:6379';
    
    // Get reference to the mock Redis client
    mockRedisClient = redis.createClient();
    
    queue = new Queue({ name: 'test-queue' });
  });
  
  test('creates a queue with the correct name', () => {
    expect(queue.name).toBe('test-queue');
  });
  
  test('throws error when Redis URL is not provided', () => {
    delete process.env.REDIS_URL;
    
    expect(() => {
      new Queue({ name: 'test-queue' });
    }).toThrow('Redis URL is required for queue operations');
  });
  
  test('registers a handler correctly', () => {
    const handler = jest.fn();
    queue.registerHandler('test-command', handler);
    
    expect(queue.handlers.get('test-command')).toBe(handler);
  });
  
  test('throws error when registering a non-function handler', () => {
    expect(() => {
      queue.registerHandler('test-command', 'not-a-function');
    }).toThrow('Handler for test-command must be a function');
  });
  
  test('enqueues a job to Redis', async () => {
    await queue._connect(); // Ensure client is connected
    
    const jobId = await queue.enqueue('test-command', { data: 'test-data' });
    
    expect(jobId).toMatch(/^job-\d+-[a-z0-9]+$/);
    expect(mockRedisClient.lPush).toHaveBeenCalledWith(
      'test-queue:queue',
      expect.stringContaining('"commandType":"test-command"')
    );
  });
  
  test('processes a command with the correct handler', async () => {
    const handler = jest.fn().mockResolvedValue('test-result');
    const payload = { data: 'test-data' };
    
    queue.registerHandler('test-command', handler);
    const result = await queue.processCommand('test-command', payload);
    
    expect(handler).toHaveBeenCalledWith(payload);
    expect(result).toBe('test-result');
  });
  
  test('throws error when no handler is registered for a command', async () => {
    await expect(queue.processCommand('unknown-command', {})).rejects.toThrow(
      'No handler registered for command type: unknown-command'
    );
  });
  
  test('processes next job successfully', async () => {
    // Mock a job in the queue
    const mockJob = {
      id: 'job-123',
      commandType: 'test-command',
      payload: { data: 'test-data' },
      addedAt: new Date().toISOString()
    };
    
    mockRedisClient.rPop.mockResolvedValueOnce(JSON.stringify(mockJob));
    
    // Register handler
    const handler = jest.fn().mockResolvedValue('test-result');
    queue.registerHandler('test-command', handler);
    
    // Process next job
    const result = await queue.processNextJob();
    
    // Verify job was processed
    expect(mockRedisClient.rPop).toHaveBeenCalledWith('test-queue:queue');
    expect(handler).toHaveBeenCalledWith({ data: 'test-data' });
    expect(mockRedisClient.hSet).toHaveBeenCalledWith(
      'test-queue:completed',
      'job-123',
      expect.stringContaining('"result":"test-result"')
    );
    expect(result.job).toEqual(mockJob);
    expect(result.result).toBe('test-result');
  });
  
  test('returns null when no jobs in queue', async () => {
    mockRedisClient.rPop.mockResolvedValueOnce(null);
    
    const result = await queue.processNextJob();
    
    expect(result).toBeNull();
  });
  
  test('handles job processing errors', async () => {
    // Mock a job in the queue
    const mockJob = {
      id: 'job-123',
      commandType: 'test-command',
      payload: { data: 'test-data' },
      addedAt: new Date().toISOString()
    };
    
    mockRedisClient.rPop.mockResolvedValueOnce(JSON.stringify(mockJob));
    
    // Register handler that throws an error
    const error = new Error('Test error');
    const handler = jest.fn().mockRejectedValue(error);
    queue.registerHandler('test-command', handler);
    
    // Process next job
    await expect(queue.processNextJob()).rejects.toThrow('Test error');
    
    // Verify error was recorded
    expect(mockRedisClient.hSet).toHaveBeenCalledWith(
      'test-queue:failed',
      'job-123',
      expect.stringContaining('"error":"Test error"')
    );
  });
});

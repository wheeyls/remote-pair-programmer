import { jest } from '@jest/globals';
import { createQueue } from '../src/utils/queueFactory.js';
import { Queue } from '../src/utils/queue.js';
import { WebServiceQueue } from '../src/utils/webServiceQueue.js';

// Mock the queue implementations
jest.mock('../src/utils/queue.js');
jest.mock('../src/utils/webServiceQueue.js');

describe('Queue Factory', () => {
  let originalEnv;
  
  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock the constructors
    Queue.mockImplementation((options) => ({
      type: 'redis',
      name: options.name,
      redisUrl: options.redisUrl
    }));
    
    WebServiceQueue.mockImplementation((options) => ({
      type: 'webservice',
      name: options.name,
      baseUrl: options.baseUrl
    }));
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });
  
  test('creates a Redis queue by default', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    
    const queue = createQueue({ name: 'test-queue' });
    
    expect(Queue).toHaveBeenCalledWith({
      name: 'test-queue',
      redisUrl: 'redis://localhost:6379'
    });
    expect(queue.type).toBe('redis');
  });
  
  test('creates a WebService queue when specified', () => {
    process.env.QUEUE_SERVICE_URL = 'http://localhost:3000/api/queue';
    
    const queue = createQueue({
      name: 'test-queue',
      queueType: 'webservice'
    });
    
    expect(WebServiceQueue).toHaveBeenCalledWith({
      name: 'test-queue',
      baseUrl: 'http://localhost:3000/api/queue'
    });
    expect(queue.type).toBe('webservice');
  });
  
  test('uses environment variable for queue type', () => {
    process.env.QUEUE_TYPE = 'webservice';
    process.env.QUEUE_SERVICE_URL = 'http://localhost:3000/api/queue';
    
    const queue = createQueue({ name: 'test-queue' });
    
    expect(WebServiceQueue).toHaveBeenCalled();
    expect(queue.type).toBe('webservice');
  });
  
  test('throws error when Redis URL is missing for Redis queue', () => {
    delete process.env.REDIS_URL;
    
    expect(() => {
      createQueue({ queueType: 'redis' });
    }).toThrow('Redis URL is required for Redis queue');
  });
  
  test('throws error when Base URL is missing for WebService queue', () => {
    delete process.env.QUEUE_SERVICE_URL;
    
    expect(() => {
      createQueue({ queueType: 'webservice' });
    }).toThrow('Base URL is required for web service queue');
  });
  
  test('uses provided options over environment variables', () => {
    process.env.QUEUE_SERVICE_URL = 'http://default-url.com';
    
    const queue = createQueue({
      queueType: 'webservice',
      baseUrl: 'http://custom-url.com',
      name: 'custom-queue'
    });
    
    expect(WebServiceQueue).toHaveBeenCalledWith({
      name: 'custom-queue',
      baseUrl: 'http://custom-url.com'
    });
  });
});

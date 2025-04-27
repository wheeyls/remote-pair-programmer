import { jest } from '@jest/globals';
import { createQueue } from '../src/utils/queueFactory.js';
import { WebServiceQueue } from '../src/utils/webServiceQueue.js';

// Mock the WebServiceQueue implementation
jest.mock('../src/utils/webServiceQueue.js');

describe('Queue Factory', () => {
  let originalEnv;
  
  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock the constructor
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
  
  test('creates a WebService queue with correct parameters', () => {
    process.env.QUEUE_SERVICE_URL = 'http://localhost:3000/api/queue';
    process.env.QUEUE_AUTH_TOKEN = 'test-auth-token';
    
    const queue = createQueue({ name: 'test-queue' });
    
    expect(WebServiceQueue).toHaveBeenCalledWith({
      name: 'test-queue',
      baseUrl: 'http://localhost:3000/api/queue',
      authToken: 'test-auth-token'
    });
    expect(queue.type).toBe('webservice');
  });
  
  test('throws error when Base URL is missing', () => {
    delete process.env.QUEUE_SERVICE_URL;
    
    expect(() => {
      createQueue({ name: 'test-queue' });
    }).toThrow('Base URL is required for web service queue');
  });
  
  test('uses provided options over environment variables', () => {
    process.env.QUEUE_SERVICE_URL = 'http://default-url.com';
    process.env.QUEUE_AUTH_TOKEN = 'default-token';
    
    const queue = createQueue({
      baseUrl: 'http://custom-url.com',
      name: 'custom-queue',
      authToken: 'custom-token'
    });
    
    expect(WebServiceQueue).toHaveBeenCalledWith({
      name: 'custom-queue',
      baseUrl: 'http://custom-url.com',
      authToken: 'custom-token'
    });
  });
});

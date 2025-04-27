const Queue = require('../src/utils/queue');

describe('Queue', () => {
  let queue;
  
  beforeEach(() => {
    queue = new Queue({ name: 'test-queue' });
  });
  
  test('creates a queue with the correct name', () => {
    expect(queue.name).toBe('test-queue');
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
  
  test('processes a command with the correct handler', async () => {
    const handler = jest.fn().mockResolvedValue('test-result');
    const payload = { data: 'test-data' };
    
    queue.registerHandler('test-command', handler);
    const result = await queue.enqueue('test-command', payload);
    
    expect(handler).toHaveBeenCalledWith(payload);
    expect(result).toBe('test-result');
  });
  
  test('throws error when no handler is registered for a command', async () => {
    await expect(queue.enqueue('unknown-command', {})).rejects.toThrow(
      'No handler registered for command type: unknown-command'
    );
  });
  
  test('throws error when handler throws an error', async () => {
    const error = new Error('Test error');
    const handler = jest.fn().mockRejectedValue(error);
    
    queue.registerHandler('test-command', handler);
    
    await expect(queue.enqueue('test-command', {})).rejects.toThrow('Test error');
  });
});

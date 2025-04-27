import { Queue } from './queue.js';
import { WebServiceQueue } from './webServiceQueue.js';

/**
 * Factory function to create the appropriate queue instance based on configuration
 * @param {Object} options - Queue configuration options
 * @param {string} options.queueType - Type of queue to create ('redis' or 'webservice')
 * @param {string} [options.name] - Queue name
 * @param {string} [options.redisUrl] - Redis URL (for Redis queue)
 * @param {string} [options.baseUrl] - Base URL (for WebService queue)
 * @returns {Queue|WebServiceQueue} The queue instance
 */
export function createQueue(options = {}) {
  const queueType = options.queueType || process.env.QUEUE_TYPE || 'redis';
  
  if (queueType === 'webservice') {
    // Create a WebServiceQueue
    const baseUrl = options.baseUrl || process.env.QUEUE_SERVICE_URL;
    if (!baseUrl) {
      throw new Error('Base URL is required for web service queue');
    }
    
    return new WebServiceQueue({
      name: options.name || 'default',
      baseUrl
    });
  } else {
    // Default to Redis queue
    const redisUrl = options.redisUrl || process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('Redis URL is required for Redis queue');
    }
    
    return new Queue({
      name: options.name || 'default',
      redisUrl
    });
  }
}

import { WebServiceQueue } from './webServiceQueue.js';

/**
 * Create a WebServiceQueue instance
 * @param {Object} options - Queue configuration options
 * @param {string} [options.name] - Queue name
 * @param {string} [options.baseUrl] - Base URL for the web service
 * @param {string} [options.authToken] - Bearer authentication token
 * @returns {WebServiceQueue} The queue instance
 */
export function createQueue(options = {}) {
  const baseUrl = options.baseUrl || process.env.QUEUE_SERVICE_URL;
  if (!baseUrl) {
    throw new Error('Base URL is required for web service queue');
  }
  
  const authToken = options.authToken || process.env.QUEUE_AUTH_TOKEN;
  
  return new WebServiceQueue({
    name: options.name || 'default',
    baseUrl,
    authToken
  });
}

import { WebServiceQueue } from './webServiceQueue.js';
import { config } from '../config.js';

/**
 * Create a WebServiceQueue instance
 * @param {Object} options - Queue configuration options
 * @param {string} [options.name] - Queue name
 * @param {string} [options.baseUrl] - Base URL for the web service
 * @param {string} [options.authToken] - Bearer authentication token
 * @returns {WebServiceQueue} The queue instance
 */
export function createQueue(options = {}) {
  const baseUrl = options.baseUrl || config.queue.serviceUrl;
  if (!baseUrl) {
    throw new Error('Base URL is required for web service queue');
  }

  const authToken = options.authToken || config.queue.authToken;

  return new WebServiceQueue({
    name: options.name || 'default',
    baseUrl,
    authToken,
  });
}

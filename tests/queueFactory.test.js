import { jest } from '@jest/globals';
import { createQueue } from '../src/utils/queueFactory.js';
import { WebServiceQueue } from '../src/utils/webServiceQueue.js';

describe('Queue Factory', () => {
  let options = {};
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Set required environment variables
    options = { baseUrl: 'http://test-url.com' };
  });

  test('returns a WebServiceQueue instance', () => {
    // Call the factory
    const queue = createQueue(options);

    // Verify it returns a WebServiceQueue
    expect(queue).toBeInstanceOf(WebServiceQueue);
  });
});

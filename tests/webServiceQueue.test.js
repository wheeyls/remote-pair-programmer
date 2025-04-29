import { jest } from '@jest/globals';
import { WebServiceQueue } from '../src/utils/webServiceQueue.js';
import http from 'http';

describe('WebServiceQueue', () => {
  let server;
  let queue;
  let serverPort;
  let requestLog = [];
  let responseToSend = { status: 200, body: null };

  // Set up a test HTTP server to intercept requests
  beforeAll((done) => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        // Log the request for assertions
        requestLog.push({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: body ? JSON.parse(body) : null,
        });

        // Send the configured response
        res.statusCode = responseToSend.status;
        res.setHeader('Content-Type', 'application/json');

        if (responseToSend.body) {
          res.end(JSON.stringify(responseToSend.body));
        } else {
          res.end();
        }
      });
    });

    // Start server on a random port
    server.listen(0, () => {
      serverPort = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    // Reset request log and default response
    requestLog = [];
    responseToSend = { status: 200, body: null };

    // Create a new queue instance pointing to our test server
    queue = new WebServiceQueue({
      baseUrl: `http://localhost:${serverPort}`,
    });
  });

  test('creates a queue with the correct name and baseUrl', () => {
    expect(queue.name).toBe('default');
    expect(queue.baseUrl).toBe(`http://localhost:${serverPort}`);
    expect(queue.authToken).toBeUndefined();

    const namedQueue = new WebServiceQueue({
      name: 'test-queue',
      baseUrl: `http://localhost:${serverPort}`,
      authToken: 'test-token',
    });
    expect(namedQueue.name).toBe('test-queue');
    expect(namedQueue.authToken).toBe('test-token');
  });

  test('throws error when baseUrl is not provided', () => {
    expect(() => {
      new WebServiceQueue({});
    }).toThrow('Base URL is required for web service queue operations');
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

  test('enqueues a job to the web service', async () => {
    await queue.enqueue('test-command', { data: 'test-data' });

    // Verify the request was made correctly
    expect(requestLog.length).toBe(1);
    expect(requestLog[0].method).toBe('POST');
    expect(requestLog[0].url).toBe('/');
    expect(requestLog[0].headers['content-type']).toBe('application/json');
    expect(requestLog[0].body).toEqual({
      name: 'test-command',
      body: { data: 'test-data' },
    });
  });

  test('includes X-API-Token header when auth token is provided', async () => {
    // Create a queue with auth token
    const queueWithAuth = new WebServiceQueue({
      baseUrl: `http://localhost:${serverPort}`,
      authToken: 'test-token',
    });

    await queueWithAuth.enqueue('test-command', { data: 'test-data' });

    // Verify the auth header was included
    expect(requestLog.length).toBe(1);
    expect(requestLog[0].headers['x-api-token']).toBe('test-token');
  });

  test('handles enqueue errors', async () => {
    // Configure server to return an error
    responseToSend.status = 500;

    await expect(queue.enqueue('test-command', {})).rejects.toThrow(
      'Failed to enqueue job: 500 Internal Server Error'
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
      name: 'test-command',
      body: { data: 'test-data' },
      addedAt: new Date().toISOString(),
    };

    // Configure server to return a job
    responseToSend.body = mockJob;

    // Register handler
    const handler = jest.fn().mockResolvedValue('test-result');
    queue.registerHandler('test-command', handler);

    // Process next job
    const result = await queue.processNextJob();

    // Verify job was processed
    expect(requestLog.length).toBe(2); // GET + POST for completion
    expect(requestLog[0].method).toBe('GET');
    expect(requestLog[0].url).toBe('/next');

    // Verify completion was recorded
    expect(requestLog[1].method).toBe('POST');
    expect(requestLog[1].url).toBe('/completed/job-123');
    expect(requestLog[1].body).toEqual({
      job: mockJob,
      result: 'test-result',
      completedAt: expect.any(String),
    });

    // Verify result
    expect(result.job).toEqual(mockJob);
    expect(result.result).toBe('test-result');
    expect(handler).toHaveBeenCalledWith({ data: 'test-data' });
  });

  test('returns null when no jobs in queue', async () => {
    // Configure server to return 404 (no jobs)
    responseToSend.status = 404;

    const result = await queue.processNextJob();

    expect(result).toBeNull();
    expect(requestLog.length).toBe(1);
    expect(requestLog[0].method).toBe('GET');
    expect(requestLog[0].url).toBe('/next');
  });

  test('returns null when empty response', async () => {
    // Configure server to return empty response with 200
    responseToSend.status = 200;
    responseToSend.body = null;

    // Mock content-length header to be 0
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-length', '0']]),
        json: () => Promise.reject(new Error('No JSON content')),
      });
    });

    const result = await queue.processNextJob();

    expect(result).toBeNull();

    // Restore original fetch
    global.fetch = originalFetch;
  });

  test('handles job processing errors', async () => {
    // Mock a job in the queue
    const mockJob = {
      id: 'job-123',
      name: 'test-command',
      body: { data: 'test-data' },
      addedAt: new Date().toISOString(),
    };

    // Configure server to return a job
    responseToSend.body = mockJob;

    // Register handler that throws an error
    const error = new Error('Test error');
    const handler = jest.fn().mockRejectedValue(error);
    queue.registerHandler('test-command', handler);

    // Process next job
    await expect(queue.processNextJob()).rejects.toThrow('Test error');

    // Verify error was recorded
    expect(requestLog.length).toBe(2); // GET + POST for failure
    expect(requestLog[1].method).toBe('POST');
    expect(requestLog[1].url).toBe('/failed/job-123');
    expect(requestLog[1].body).toEqual({
      job: mockJob,
      error: 'Test error',
      failedAt: expect.any(String),
    });
  });
});

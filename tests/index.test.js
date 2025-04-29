import { jest } from '@jest/globals';
import { initializeHandler, runHandler } from '../src/index.js';
import http from 'http';

describe('Handler', () => {
  let server;
  let serverPort;
  let requestLog = [];
  let responseToSend = { status: 200, body: null };
  let mockAIClient;
  let config;

  // Set up a test HTTP server to intercept requests
  beforeAll((done) => {
    config = {
      ai: {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        strongModel: 'gpt-4',
        weakModel: 'gpt-3.5-turbo',
        triggerPhrase: '@test-bot',
      },
      queue: {
        serviceUrl: 'http://localhost:0', // Will be replaced with actual port
        authToken: 'test-token',
      },
      actions: {
        repoOwner: 'test-owner',
        repoName: 'test-repo',
        prNumber: '123',
        commentId: '456',
      },
      bot: {
        triggerPhrase: '@test-bot',
      },
    };
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
      // Update the config to use our test server
      config.queue.serviceUrl = `http://localhost:${serverPort}`;
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

    // Create mock AI client for dependency injection
    mockAIClient = {
      generateCompletion: jest.fn().mockResolvedValue('Test response'),
    };
  });

  test('processes pull request command correctly', async () => {
    // Run the handler with the PR command
    await runHandler('process-pr', {
      aiClient: mockAIClient,
      config: config,
    });

    // Check if the correct request was made to the queue service
    expect(requestLog.length).toBe(1);
    expect(requestLog[0].method).toBe('POST');
    expect(requestLog[0].url).toBe('/');
    expect(requestLog[0].headers['content-type']).toBe('application/json');
    expect(requestLog[0].headers['x-api-token']).toBe('test-token');
    expect(requestLog[0].body).toEqual({
      name: 'process-pr',
      body: {
        owner: 'test-owner',
        repo: 'test-repo',
        prNumber: '123',
      },
    });
  });

  test('processes comment command correctly', async () => {
    // Run the handler with the comment command
    await runHandler('process-comment', {
      aiClient: mockAIClient,
      config: config,
    });

    // Check if the correct request was made to the queue service
    expect(requestLog.length).toBe(1);
    expect(requestLog[0].method).toBe('POST');
    expect(requestLog[0].body).toEqual({
      name: 'process-comment',
      body: {
        owner: 'test-owner',
        repo: 'test-repo',
        prNumber: '123',
        commentId: '456',
      },
    });
  });

  test('processes issue command correctly', async () => {
    // Run the handler with the issue command
    await runHandler('process-issue', {
      aiClient: mockAIClient,
      config: config,
    });

    // Check if the correct request was made to the queue service
    expect(requestLog.length).toBe(1);
    expect(requestLog[0].method).toBe('POST');
    expect(requestLog[0].body).toEqual({
      name: 'process-issue',
      body: {
        owner: 'test-owner',
        repo: 'test-repo',
        issueNumber: '123',
      },
    });
  });

  test('processes issue comment command correctly', async () => {
    // Run the handler with the issue comment command
    await runHandler('process-issue-comment', {
      aiClient: mockAIClient,
      config: config,
    });

    // Check if the correct request was made to the queue service
    expect(requestLog.length).toBe(1);
    expect(requestLog[0].method).toBe('POST');
    expect(requestLog[0].body).toEqual({
      name: 'process-issue-comment',
      body: {
        owner: 'test-owner',
        repo: 'test-repo',
        issueNumber: '123',
        commentId: '456',
      },
    });
  });

  test('processes review comment command correctly', async () => {
    // Run the handler with the review comment command
    await runHandler('process-review-comment', {
      aiClient: mockAIClient,
      config: config,
    });

    // Check if the correct request was made to the queue service
    expect(requestLog.length).toBe(1);
    expect(requestLog[0].method).toBe('POST');
    expect(requestLog[0].body).toEqual({
      name: 'process-review-comment',
      body: {
        owner: 'test-owner',
        repo: 'test-repo',
        prNumber: '123',
        commentId: '456',
      },
    });
  });

  test('processes revert command correctly', async () => {
    // Run the handler with the revert command
    await runHandler('process-revert', {
      aiClient: mockAIClient,
      config: config,
    });

    // Check if the correct request was made to the queue service
    expect(requestLog.length).toBe(1);
    expect(requestLog[0].method).toBe('POST');
    expect(requestLog[0].body).toEqual({
      name: 'process-revert',
      body: {
        owner: 'test-owner',
        repo: 'test-repo',
        prNumber: '123',
        commentId: '456',
      },
    });
  });

  test('exits with error for invalid command', async () => {
    // Mock process.exit
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

    // Mock console.error
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    // Run the handler with an invalid command
    await runHandler('invalid-command', {
      aiClient: mockAIClient,
      config: config,
    });

    // Check if error was logged and process.exit was called
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid command')
    );
    expect(mockExit).toHaveBeenCalledWith(1);

    // Restore mocks
    mockExit.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});

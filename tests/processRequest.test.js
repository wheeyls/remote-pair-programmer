import { jest } from '@jest/globals';
import processRequest from '../src/utils/processRequest.js';
import { PRHelper } from '../src/github/prHelper.js';

describe('processRequest', () => {
  let mockAiClient;
  let mockOctokit;
  let mockContext;
  let mockModifyCode;
  let modifyResponse;

  beforeEach(() => {
    // Mock AI client
    mockAiClient = {
      generateCompletion: jest.fn().mockResolvedValue('AI response'),
    };

    // Mock Octokit
    mockOctokit = {
      issues: {
        createComment: jest.fn().mockResolvedValue({}),
      },
    };

    modifyResponse = {
      success: true,
      explanation: 'Changed some code',
      changedFiles: ['file1.js', 'file2.js'],
    };
    mockModifyCode = jest.fn().mockResolvedValue(modifyResponse);

    // Mock context
    mockContext = {
      owner: 'test-owner',
      repo: 'test-repo',
      prNumber: 123,
      diff: 'test-diff',
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  test('handles code modification requests', async () => {
    const result = await processRequest({
      aiClient: mockAiClient,
      triggerPhrase: '@test-bot',
      requestText: '@test-bot change this code please',
      context: mockContext,
      codeModifier: mockModifyCode,
      octokit: mockOctokit,
    });

    // Check if mockModifyCode was called with correct parameters
    // (should have received a prHelper instance)
    expect(mockModifyCode).toHaveBeenCalledWith({
      prHelper: expect.any(PRHelper),
      aiClient: mockAiClient,
      contextContent: expect.objectContaining({
        requestText: '@test-bot change this code please',
        prHelper: expect.any(PRHelper),
      }),
      octokit: mockOctokit,
    });

    // Check if comment was created with success message
    expect(mockOctokit.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123,
      body: expect.stringContaining("✅ I've made the requested changes"),
    });

    // Check return value
    expect(result).toEqual({
      success: true,
      isCodeMod: true,
      response: expect.stringContaining("✅ I've made the requested changes"),
    });
  });

  test('handles code modification failures', async () => {
    // Mock failed code modification
    mockModifyCode.mockResolvedValue({
      success: false,
      error: 'Something went wrong',
    });

    await processRequest({
      aiClient: mockAiClient,
      triggerPhrase: '@test-bot',
      requestText: '@test-bot implement a feature',
      context: mockContext,
      codeModifier: mockModifyCode,
      octokit: mockOctokit,
    });

    // Check if comment was created with error message
    expect(mockOctokit.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123,
      body: expect.stringContaining('❌ I encountered an error'),
    });
  });
});

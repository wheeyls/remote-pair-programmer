import { jest } from '@jest/globals';
import processRequest from '../src/utils/processRequest.js';
import { PRHelper } from '../src/github/prHelper.js';
import { ContextContent } from '../src/codeChanges/ContextContent.js';
import { setOctokit } from '../src/providers/octokitProvider.js';
import { mockOctokit } from './fixtures/mockOctokit.js';

describe('processRequest', () => {
  let mockAiClient;
  let mockContext;
  let mockModifyCode;
  let modifyResponse;

  async function subject() {
    return await setOctokit(mockOctokit, async () => {
      return await processRequest({
        aiClient: mockAiClient,
        triggerPhrase: '@test-bot',
        requestText: '@test-bot change this code please',
        context: mockContext,
        codeModifier: mockModifyCode,
      });
    });
  }

  beforeEach(() => {
    // Mock AI client
    mockAiClient = {
      generateCompletion: jest.fn().mockResolvedValue('AI response'),
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
    const result = await subject();
    // Check if mockModifyCode was called with correct parameters
    // (should have received a prHelper instance)
    expect(mockModifyCode).toHaveBeenCalledWith({
      prHelper: expect.any(PRHelper),
      aiClient: mockAiClient,
      contextContent: expect.any(ContextContent),
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

    await subject();

    // Check if comment was created with error message
    expect(mockOctokit.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123,
      body: expect.stringContaining('❌ I encountered an error'),
    });
  });
});

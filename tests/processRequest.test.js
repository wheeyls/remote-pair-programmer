const processRequest = require('../src/utils/processRequest');
const { modifyCode } = require('../src/codeChanges');

// Mock dependencies
jest.mock('../src/codeChanges', () => ({
  modifyCode: jest.fn()
}));

describe('processRequest', () => {
  let mockAiClient;
  let mockOctokit;
  let mockContext;
  
  beforeEach(() => {
    // Mock AI client
    mockAiClient = {
      generateCompletion: jest.fn().mockResolvedValue('AI response')
    };
    
    // Mock Octokit
    mockOctokit = {
      issues: {
        createComment: jest.fn().mockResolvedValue({})
      }
    };
    
    // Mock context
    mockContext = {
      owner: 'test-owner',
      repo: 'test-repo',
      prNumber: 123,
      diff: 'test-diff'
    };
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  test('handles code modification requests', async () => {
    // Mock successful code modification
    modifyCode.mockResolvedValue({
      success: true,
      explanation: 'Changed some code',
      changedFiles: ['file1.js', 'file2.js']
    });
    
    const result = await processRequest({
      aiClient: mockAiClient,
      triggerPhrase: '@test-bot',
      requestText: '@test-bot change this code please',
      context: mockContext,
      octokit: mockOctokit
    });
    
    // Check if modifyCode was called with correct parameters
    expect(modifyCode).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      prNumber: 123,
      requestText: '@test-bot change this code please',
      aiClient: mockAiClient
    });
    
    // Check if comment was created with success message
    expect(mockOctokit.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123,
      body: expect.stringContaining('✅ I\'ve made the requested changes')
    });
    
    // Check return value
    expect(result).toEqual({
      success: true,
      isCodeMod: true,
      response: expect.stringContaining('✅ I\'ve made the requested changes')
    });
  });
  
  test('handles code modification failures', async () => {
    // Mock failed code modification
    modifyCode.mockResolvedValue({
      success: false,
      error: 'Something went wrong'
    });
    
    await processRequest({
      aiClient: mockAiClient,
      triggerPhrase: '@test-bot',
      requestText: '@test-bot implement a feature',
      context: mockContext,
      octokit: mockOctokit
    });
    
    // Check if comment was created with error message
    expect(mockOctokit.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123,
      body: expect.stringContaining('❌ I encountered an error')
    });
  });
  
  test('handles regular comments', async () => {
    await processRequest({
      aiClient: mockAiClient,
      triggerPhrase: '@test-bot',
      requestText: 'Just a regular comment',
      context: mockContext,
      octokit: mockOctokit
    });
    
    // Check if AI was called to generate a response
    expect(mockAiClient.generateCompletion).toHaveBeenCalled();
    
    // Check if comment was created with AI response
    expect(mockOctokit.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123,
      body: expect.stringContaining('AI response')
    });
  });
  
  test('handles complex questions with strong model', async () => {
    await processRequest({
      aiClient: mockAiClient,
      triggerPhrase: '@test-bot',
      requestText: 'Can you explain how this algorithm works in detail?',
      context: mockContext,
      octokit: mockOctokit
    });
    
    // Check if AI was called with strong model
    expect(mockAiClient.generateCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        modelStrength: 'strong'
      })
    );
  });
  
  test('handles simple questions with weak model', async () => {
    await processRequest({
      aiClient: mockAiClient,
      triggerPhrase: '@test-bot',
      requestText: 'Thanks!',
      context: mockContext,
      octokit: mockOctokit
    });
    
    // Check if AI was called with weak model
    expect(mockAiClient.generateCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        modelStrength: 'weak'
      })
    );
  });
  
  test('handles errors during processing', async () => {
    // Mock AI client to throw an error
    mockAiClient.generateCompletion.mockRejectedValue(new Error('AI error'));
    
    await processRequest({
      aiClient: mockAiClient,
      triggerPhrase: '@test-bot',
      requestText: 'This will cause an error',
      context: mockContext,
      octokit: mockOctokit
    });
    
    // Check if error comment was created
    expect(mockOctokit.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123,
      body: expect.stringContaining('❌ I encountered an error')
    });
  });
});

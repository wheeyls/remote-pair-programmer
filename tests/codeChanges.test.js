import { jest } from '@jest/globals';
import { modifyCode } from '../src/codeChanges/index.js';
import fs from 'fs';
import path from 'path';

describe('modifyCode', () => {
  // Original process.chdir and cwd
  const originalChdir = process.chdir;
  const originalCwd = process.cwd;
  
  // Setup before each test
  beforeEach(() => {
    // Mock process.chdir and process.cwd
    process.chdir = jest.fn();
    process.cwd = jest.fn().mockReturnValue('/original/dir');
    
    // Mock fs functions that interact with the file system
    jest.spyOn(fs, 'mkdtempSync').mockReturnValue('/tmp/mock-dir');
    jest.spyOn(fs, 'rmSync').mockImplementation(() => {});
  });
  
  // Cleanup after each test
  afterEach(() => {
    // Restore original functions
    process.chdir = originalChdir;
    process.cwd = originalCwd;
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  test('successfully modifies code for a pull request', async () => {
    // Create mock dependencies
    const mockAiClient = { 
      generateCompletion: jest.fn().mockResolvedValue('AI response')
    };
    
    const mockGit = {
      clone: jest.fn(),
      checkoutNewBranch: jest.fn(),
      addAll: jest.fn(),
      commit: jest.fn(),
      push: jest.fn()
    };
    
    const mockOctokit = {
      pulls: {
        get: jest.fn().mockResolvedValue({
          data: {
            head: {
              ref: 'feature-branch',
              repo: {
                clone_url: 'https://github.com/owner/repo.git'
              }
            }
          }
        }),
        listFiles: jest.fn().mockResolvedValue({
          data: [
            { filename: 'file1.js', status: 'modified' },
            { filename: 'file2.js', status: 'added' }
          ]
        })
      }
    };
    
    // Mock utility functions
    const mockRequestCodeChanges = jest.fn().mockResolvedValue({
      changes: [
        {
          filename: 'file1.js',
          search: 'old code',
          replace: 'new code'
        }
      ],
      explanation: 'Updated the code'
    });
    
    const mockGetRefinedExplanation = jest.fn().mockResolvedValue('Refined explanation');
    const mockProcessFileContext = jest.fn().mockReturnValue({
      'file1.js': 'content of file1',
      'file2.js': 'content of file2'
    });
    const mockApplyPatches = jest.fn().mockImplementation((blocks, changedFiles) => {
      // Add the filename to changedFiles set
      blocks.forEach(block => changedFiles.add(block.filename));
      return Promise.resolve([]);
    });
    const mockIsPullRequest = jest.fn().mockResolvedValue(true);
    
    // Inject all dependencies
    const result = await modifyCode({
      owner: 'owner',
      repo: 'repo',
      prNumber: 123,
      requestText: '@bot please update the code',
      aiClient: mockAiClient,
      octokit: mockOctokit,
      git: mockGit,
      // Inject utility functions
      utils: {
        requestCodeChanges: mockRequestCodeChanges,
        getRefinedExplanation: mockGetRefinedExplanation,
        processFileContext: mockProcessFileContext,
        applyPatches: mockApplyPatches,
        isPullRequest: mockIsPullRequest
      }
    });
    
    // Verify the result
    expect(result.success).toBe(true);
    expect(result.changedFiles).toEqual(['file1.js']);
    
    // Verify that a temporary directory was created
    expect(fs.mkdtempSync).toHaveBeenCalled();
    
    // Verify that we changed to the temp directory and back
    expect(process.chdir).toHaveBeenCalledWith('/tmp/mock-dir');
    expect(process.chdir).toHaveBeenCalledWith('/original/dir');
    
    // Verify that the temp directory was cleaned up
    expect(fs.rmSync).toHaveBeenCalledWith('/tmp/mock-dir', { recursive: true, force: true });
    
    // Verify that the GitClient was used correctly
    expect(mockGit.clone).toHaveBeenCalled();
    expect(mockGit.addAll).toHaveBeenCalled();
    expect(mockGit.commit).toHaveBeenCalled();
    expect(mockGit.push).toHaveBeenCalled();
    
    // Verify that the AI was used to generate changes
    expect(mockRequestCodeChanges).toHaveBeenCalled();
    expect(mockGetRefinedExplanation).toHaveBeenCalled();
    
    // Verify that patches were applied
    expect(mockApplyPatches).toHaveBeenCalled();
  });
  
  test('handles errors during code modification', async () => {
    // Create mock dependencies with error
    const mockAiClient = { 
      generateCompletion: jest.fn().mockResolvedValue('AI response')
    };
    
    const mockGit = {
      clone: jest.fn(),
      checkoutNewBranch: jest.fn(),
      addAll: jest.fn(),
      commit: jest.fn(),
      push: jest.fn()
    };
    
    const mockOctokit = {
      pulls: {
        get: jest.fn().mockResolvedValue({
          data: {
            head: {
              ref: 'feature-branch',
              repo: {
                clone_url: 'https://github.com/owner/repo.git'
              }
            }
          }
        }),
        listFiles: jest.fn().mockResolvedValue({
          data: [
            { filename: 'file1.js', status: 'modified' }
          ]
        })
      }
    };
    
    // Mock utility functions with error
    const mockRequestCodeChanges = jest.fn().mockRejectedValue(
      new Error('AI service unavailable')
    );
    
    const mockIsPullRequest = jest.fn().mockResolvedValue(true);
    const mockProcessFileContext = jest.fn().mockReturnValue({
      'file1.js': 'content of file1'
    });
    
    const result = await modifyCode({
      owner: 'owner',
      repo: 'repo',
      prNumber: 123,
      requestText: '@bot please update the code',
      aiClient: mockAiClient,
      octokit: mockOctokit,
      git: mockGit,
      utils: {
        requestCodeChanges: mockRequestCodeChanges,
        processFileContext: mockProcessFileContext,
        isPullRequest: mockIsPullRequest
      }
    });
    
    // Verify the error result
    expect(result.success).toBe(false);
    expect(result.error).toBe('AI service unavailable');
    
    // Verify that we still cleaned up
    expect(process.chdir).toHaveBeenCalledWith('/original/dir');
    expect(fs.rmSync).toHaveBeenCalledWith('/tmp/mock-dir', { recursive: true, force: true });
  });
  
  test('creates a new branch for issues', async () => {
    // Create mock dependencies
    const mockAiClient = { 
      generateCompletion: jest.fn().mockResolvedValue('AI response')
    };
    
    const mockGit = {
      clone: jest.fn(),
      checkoutNewBranch: jest.fn(),
      addAll: jest.fn(),
      commit: jest.fn(),
      push: jest.fn()
    };
    
    const mockOctokit = {
      repos: {
        get: jest.fn().mockResolvedValue({
          data: {
            default_branch: 'main',
            clone_url: 'https://github.com/owner/repo.git'
          }
        })
      }
    };
    
    // Mock utility functions
    const mockRequestCodeChanges = jest.fn().mockResolvedValue({
      changes: [
        {
          filename: 'file1.js',
          search: 'old code',
          replace: 'new code'
        }
      ],
      explanation: 'Updated the code'
    });
    
    const mockGetRefinedExplanation = jest.fn().mockResolvedValue('Refined explanation');
    const mockProcessFileContext = jest.fn().mockReturnValue({
      'file1.js': 'content of file1'
    });
    const mockApplyPatches = jest.fn().mockResolvedValue([]);
    const mockIsPullRequest = jest.fn().mockResolvedValue(false);
    
    await modifyCode({
      owner: 'owner',
      repo: 'repo',
      prNumber: 456, // This is an issue number
      requestText: '@bot implement this feature',
      aiClient: mockAiClient,
      octokit: mockOctokit,
      git: mockGit,
      utils: {
        requestCodeChanges: mockRequestCodeChanges,
        getRefinedExplanation: mockGetRefinedExplanation,
        processFileContext: mockProcessFileContext,
        applyPatches: mockApplyPatches,
        isPullRequest: mockIsPullRequest
      }
    });
    
    // Verify that a new branch was created
    expect(mockGit.checkoutNewBranch).toHaveBeenCalledWith('ai-changes-issue-456');
  });
  
  test('handles empty search/replace blocks', async () => {
    // Create mock dependencies
    const mockAiClient = { 
      generateCompletion: jest.fn().mockResolvedValue('AI response')
    };
    
    const mockGit = {
      clone: jest.fn(),
      checkoutNewBranch: jest.fn()
    };
    
    const mockOctokit = {
      pulls: {
        get: jest.fn().mockResolvedValue({
          data: {
            head: {
              ref: 'feature-branch',
              repo: {
                clone_url: 'https://github.com/owner/repo.git'
              }
            }
          }
        }),
        listFiles: jest.fn().mockResolvedValue({
          data: [
            { filename: 'file1.js', status: 'modified' }
          ]
        })
      }
    };
    
    // Mock utility functions with empty changes
    const mockRequestCodeChanges = jest.fn().mockResolvedValue({
      changes: [],
      explanation: 'No changes needed'
    });
    
    const mockProcessFileContext = jest.fn().mockReturnValue({
      'file1.js': 'content of file1'
    });
    const mockIsPullRequest = jest.fn().mockResolvedValue(true);
    
    const result = await modifyCode({
      owner: 'owner',
      repo: 'repo',
      prNumber: 123,
      requestText: '@bot please update the code',
      aiClient: mockAiClient,
      octokit: mockOctokit,
      git: mockGit,
      utils: {
        requestCodeChanges: mockRequestCodeChanges,
        processFileContext: mockProcessFileContext,
        isPullRequest: mockIsPullRequest
      }
    });
    
    // Verify the error result
    expect(result.success).toBe(false);
    expect(result.error).toBe('No valid search/replace blocks found in AI response');
  });
});

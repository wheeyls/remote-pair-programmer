import { jest } from '@jest/globals';
import { modifyCode } from '../src/codeChanges/index.js';
import { PRHelper } from '../src/github/prHelper.js';
import { ContextContent } from '../src/codeChanges/ContextContent.js';
import fs from 'fs';
import path from 'path';

describe('modifyCode', () => {
  // Original process.chdir and cwd
  const originalChdir = process.chdir;
  const originalCwd = process.cwd;

  // Common mocks
  let mockAiClient;
  let mockGit;
  let mockOctokit;
  let mockUtils;
  let prHelper;
  let contextContent;
  let mockPlan;

  // Setup before each test
  beforeEach(() => {
    // Mock process.chdir and process.cwd
    process.chdir = jest.fn();
    process.cwd = jest.fn().mockReturnValue('/original/dir');

    // Mock fs functions that interact with the file system
    jest.spyOn(fs, 'mkdtempSync').mockReturnValue('/tmp/mock-dir');
    jest.spyOn(fs, 'rmSync').mockImplementation(() => {});

    // Setup common mocks
    mockAiClient = {
      generateCompletion: jest.fn().mockResolvedValue('AI response'),
    };

    mockPlan = {
      getPlan: jest.fn().mockResolvedValue('Plan for code changes'),
    };

    mockGit = {
      clone: jest.fn(),
      checkoutNewBranch: jest.fn(),
      addAll: jest.fn(),
      commit: jest.fn(),
      push: jest.fn(),
    };

    mockOctokit = {
      pulls: {
        get: jest.fn().mockResolvedValue({
          data: {
            head: {
              ref: 'feature-branch',
              repo: {
                clone_url: 'https://github.com/owner/repo.git',
              },
            },
          },
        }),
        listFiles: jest.fn().mockResolvedValue({
          data: [
            { filename: 'file1.js', status: 'modified' },
            { filename: 'file2.js', status: 'added' },
          ],
        }),
      },
      repos: {
        get: jest.fn().mockResolvedValue({
          data: {
            default_branch: 'main',
            clone_url: 'https://github.com/owner/repo.git',
          },
        }),
      },
    };

    // Setup PR helper
    prHelper = new PRHelper({
      octokit: mockOctokit,
      owner: 'owner',
      repo: 'repo',
      prNumber: 123,
    });

    // Mock PR helper methods
    prHelper.isPR = jest.fn().mockResolvedValue(true);
    prHelper.getDetails = jest
      .fn()
      .mockImplementation(() =>
        mockOctokit.pulls.get().then((res) => res.data)
      );
    prHelper.getFiles = jest
      .fn()
      .mockImplementation(() =>
        mockOctokit.pulls.listFiles().then((res) => res.data)
      );

    // Setup context content
    contextContent = new ContextContent('Test request', prHelper);

    // Mock utility functions
    mockUtils = {
      plan: mockPlan,
      requestCodeChanges: jest.fn().mockResolvedValue({
        changes: [
          {
            filename: 'file1.js',
            search: 'old code',
            replace: 'new code',
          },
        ],
        explanation: 'Updated the code',
      }),
      getRefinedExplanation: jest.fn().mockResolvedValue('Refined explanation'),
      processFileContext: jest.fn().mockReturnValue({
        'file1.js': 'content of file1',
        'file2.js': 'content of file2',
      }),
      applyPatches: jest.fn().mockImplementation((blocks, changedFiles) => {
        // Add the filename to changedFiles set
        blocks.forEach((block) => changedFiles.add(block.filename));
        return Promise.resolve([]);
      }),
    };
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
    // Inject all dependencies
    const result = await modifyCode({
      prHelper,
      aiClient: mockAiClient,
      octokit: mockOctokit,
      git: mockGit,
      utils: mockUtils,
      contextContent,
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
    expect(fs.rmSync).toHaveBeenCalledWith('/tmp/mock-dir', {
      recursive: true,
      force: true,
    });

    // Verify that the GitClient was used correctly
    expect(mockGit.clone).toHaveBeenCalled();
    expect(mockGit.addAll).toHaveBeenCalled();
    expect(mockGit.commit).toHaveBeenCalled();
    expect(mockGit.push).toHaveBeenCalled();

    // Verify that the AI was used to generate changes
    expect(mockUtils.requestCodeChanges).toHaveBeenCalled();
    expect(mockUtils.getRefinedExplanation).toHaveBeenCalled();

    // Verify that patches were applied
    expect(mockUtils.applyPatches).toHaveBeenCalled();
  });

  test('handles errors during code modification', async () => {
    // Override the requestCodeChanges mock to throw an error
    mockUtils.requestCodeChanges = jest
      .fn()
      .mockRejectedValue(new Error('AI service unavailable'));

    const result = await modifyCode({
      prHelper,
      aiClient: mockAiClient,
      octokit: mockOctokit,
      git: mockGit,
      utils: mockUtils,
      contextContent,
    });

    // Verify the error result
    expect(result.success).toBe(false);
    expect(result.error).toBe('AI service unavailable');

    // Verify that we still cleaned up
    expect(process.chdir).toHaveBeenCalledWith('/original/dir');
    expect(fs.rmSync).toHaveBeenCalledWith('/tmp/mock-dir', {
      recursive: true,
      force: true,
    });
  });

  test('creates a new branch for issues', async () => {
    // Setup for issue instead of PR
    prHelper.isPR = jest.fn().mockResolvedValue(false);
    prHelper.prNumber = 456; // This is an issue number

    await modifyCode({
      prHelper,
      aiClient: mockAiClient,
      octokit: mockOctokit,
      git: mockGit,
      utils: mockUtils,
      contextContent,
    });

    // Verify that a new branch was created
    expect(mockGit.checkoutNewBranch).toHaveBeenCalledWith(
      'ai-bot/ai-changes-issue-456'
    );
  });

  test('handles empty search/replace blocks', async () => {
    // Override the requestCodeChanges mock to return empty changes
    mockUtils.requestCodeChanges = jest.fn().mockResolvedValue({
      changes: [],
      explanation: 'No changes needed',
    });

    const result = await modifyCode({
      prHelper,
      aiClient: mockAiClient,
      octokit: mockOctokit,
      git: mockGit,
      utils: mockUtils,
      contextContent,
    });

    // Verify the error result
    expect(result.success).toBe(false);
    expect(result.error).toBe(
      'No valid search/replace blocks found in AI response'
    );
  });
});

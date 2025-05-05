import fs from 'fs';
import path from 'path';
import os from 'os';
import { getOctokit } from '../providers/octokitProvider.js';
import { processFileContext } from '../utils/fileContext.js';
import GitClient from '../utils/gitClient.js';
import { requestCodeChanges, getRefinedExplanation } from './aiUtils.js';
import { applyPatches, sanitizeForShell } from './fileUtils.js';
import { config } from '../config.js';
import { execSync } from 'child_process';
import { Plan } from './Plan.js';

 
/**
 * Analyzes a request to modify code and makes the requested changes
 * @param {Object} params - Parameters for code modification
 * @param {Object} params.prHelper - PR helper instance
 * @param {Object} params.aiClient - AIClient instance
 * @param {Object} [params.octokit] - Octokit instance (optional)
 * @param {Object} [params.git] - GitClient instance (optional)
 * @param {Object} params.contextContent - Context content for the request
 * @param {Object} [params.utils] - Utility functions for testing (optional)
 * @returns {Object} - Result of the code modification operation
 */
async function modifyCode({
  prHelper,
  aiClient,
  octokit,
  git,
  contextContent,
  utils = {},
}) {
  // Extract utility functions (for testing) or use the real ones
  const {
    requestCodeChanges: requestChanges = requestCodeChanges,
    getRefinedExplanation: getExplanation = getRefinedExplanation,
    processFileContext: processFiles = processFileContext,
    applyPatches: applyChanges = applyPatches,
  } = utils;

  let tempDir, originalDir;

  try {
    // Step 1: Setup repository
    const setup = await setupRepository(prHelper, octokit, git);
    tempDir = setup.tempDir;
    originalDir = setup.originalDir;
    octokit = setup.octokit;
    git = setup.git;

    // Step 2: Determine branch and repo
    const { branch, repoUrl } = await checkoutBranchAndRepo(
      prHelper,
      octokit,
      git
    );

    // Step 3: Generate code changes
    // Generate a plan first
    const plan = utils.plan || new Plan(contextContent, aiClient);
    contextContent.plan = await plan.getPlan();

    const { searchReplaceBlocks, explanation } = await generateCodeChanges(
      contextContent,
      aiClient,
      requestChanges
    );

    // Step 4: Apply code changes
    const { changedFiles } = await applyCodeChanges(
      searchReplaceBlocks,
      aiClient,
      contextContent,
      applyChanges
    );

    // Step 5: Commit and push changes
    await commitAndPushChanges(
      git,
      repoUrl,
      branch,
      explanation,
      prHelper.prNumber,
      getExplanation,
      aiClient
    );

    // Step 6: Cleanup
    cleanupRepository(originalDir, tempDir);

    return {
      success: true,
      explanation: explanation || 'Code changes applied successfully',
      changedFiles: Array.from(changedFiles),
    };
  } catch (error) {
    console.error('Error modifying code:', error);

    // Log more details about the error
    if (error.stderr) {
      console.error('Error details:', error.stderr.toString());
    }

    // Make sure we return to the original directory and clean up
    try {
      if (originalDir && tempDir) {
        cleanupRepository(originalDir, tempDir);
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    return {
      success: false,
      error: error.message,
      details: error.stderr ? error.stderr.toString() : undefined,
    };
  }
}

export { modifyCode };

/**
 * Sets up a temporary directory and initializes the repository
 */
async function setupRepository(prHelper, octokit, git) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'github-ai-'));
  const originalDir = process.cwd();

  process.chdir(tempDir);
  console.log(`Created temporary directory: ${tempDir}`);

  // Initialize GitHub API client if not provided
  octokit = octokit || getOctokit();

  // Initialize Git client with GitHub token if not provided
  git = git || new GitClient(config.github.token);

  return { tempDir, originalDir, octokit, git };
}

/**
 * Determines the branch and repository URL based on the context
 */
async function checkoutBranchAndRepo(prHelper, octokit, git) {
  let branch = '';
  let repoUrl = '';
  const { owner, repo } = prHelper;

  // Determine if this is a PR or an issue
  const isPullReq = await prHelper.isPR();

  if (isPullReq) {
    // For pull requests, use the PR's head branch
    await prHelper.getDetails();
    await prHelper.getFiles();

    branch = await prHelper.getBranchName();
    repoUrl = await prHelper.getCloneUrl();

    // Clone only the specific branch with minimal history
    git.clone(repoUrl, branch);
  } else {
    // For issues, we need to determine if we already have a branch or need to create one
    const { data: repoData } = await octokit.repos.get({ owner, repo });

    repoUrl = await prHelper.getCloneUrl();
    const issueBranch = await prHelper.getBranchName();

    // Check if the branch already exists
    let branchExists = false;
    try {
      await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${issueBranch}`,
      });
      branchExists = true;
    } catch (error) {
      // Branch doesn't exist yet
      branchExists = false;
    }

    if (branchExists) {
      // If branch exists, use it directly
      branch = issueBranch;
      git.clone(repoUrl, branch);
    } else {
      // If branch doesn't exist, create it from the default branch
      branch = repoData.default_branch;
      git.clone(repoUrl, branch);

      // Create and checkout a new branch for the issue
      git.checkoutNewBranch(issueBranch);
      branch = issueBranch;
    }
  }

  return { branch, repoUrl };
}

/**
 * Generates code changes using AI
 */
async function generateCodeChanges(contextContent, aiClient, requestChanges) {
  console.log('Starting two-stage code modification process');

  // Generate the actual code changes
  const changes = await requestChanges(contextContent, aiClient);
  const searchReplaceBlocks = changes.changes;

  if (searchReplaceBlocks.length === 0) {
    console.log('No search/replace blocks found in AI response');
    throw new Error('No valid search/replace blocks found in AI response');
  }

  return { searchReplaceBlocks, explanation: changes.explanation };
}

/**
 * Applies the generated code changes to the repository
 */
async function applyCodeChanges(
  searchReplaceBlocks,
  aiClient,
  contextContent,
  applyChanges
) {
  console.log('Applying SEARCH/REPLACE blocks with existing logic');

  const changedFiles = new Set();

  // Apply blocks with retry logic
  const currentBlocks = await applyChanges(
    searchReplaceBlocks,
    changedFiles,
    aiClient,
    contextContent
  );

  return { currentBlocks, changedFiles };
}

/**
 * Commits and pushes the changes to the repository
 */
async function commitAndPushChanges(
  git,
  repoUrl,
  branch,
  explanation,
  prNumber,
  getExplanation,
  aiClient
) {
  // Generate a refined commit message
  let commitMessage = await getExplanation(explanation, aiClient);

  // Sanitize the commit message for command line safety
  commitMessage = sanitizeForShell(commitMessage);

  git.addAll();
  git.commit(`${commitMessage}\n\nRequested by comment on PR #${prNumber}`);
  git.push(repoUrl, branch);
}

/**
 * Cleans up the temporary directory
 */
function cleanupRepository(originalDir, tempDir) {
  process.chdir(originalDir);
  console.log(`Cleaning up temporary directory: ${tempDir}`);
  fs.rmSync(tempDir, { recursive: true, force: true });
}

 

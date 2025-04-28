import fs from 'fs';
import path from 'path';
import os from 'os';
import { Octokit } from '@octokit/rest';
import { processFileContext } from '../utils/fileContext.js';
import GitClient from '../utils/gitClient.js';
import { isPullRequest } from './prUtils.js';
import { requestCodeChanges, getRefinedExplanation } from './aiUtils.js';
import { applyPatches, sanitizeForShell } from './fileUtils.js';

/**
 * Analyzes a request to modify code and makes the requested changes
 * @param {Object} params - Parameters for code modification
 * @param {string} params.owner - Repository owner
 * @param {string} params.repo - Repository name
 * @param {number} params.prNumber - Pull request number
 * @param {string} params.requestText - The text of the request to modify code
 * @param {Object} params.aiClient - AIClient instance
 * @param {Object} [params.octokit] - Octokit instance (optional)
 * @param {Object} [params.git] - GitClient instance (optional)
 * @param {Object} [params.utils] - Utility functions for testing (optional)
 * @returns {Object} - Result of the code modification operation
 */
async function modifyCode({ 
  owner, 
  repo, 
  prNumber, 
  requestText, 
  aiClient, 
  octokit, 
  git,
  utils = {} 
}) {
  console.log('MODIFY CODE IS ENTERED');
  // Create a temporary directory for the repository
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'github-ai-'));
  const originalDir = process.cwd();

  // Extract utility functions (for testing) or use the real ones
  const {
    requestCodeChanges: requestChanges = requestCodeChanges,
    getRefinedExplanation: getExplanation = getRefinedExplanation,
    processFileContext: processFiles = processFileContext,
    applyPatches: applyChanges = applyPatches,
    isPullRequest: isPR = isPullRequest
  } = utils;

  try {
    console.log('******************************');
    process.chdir(tempDir);
    console.log(`Created temporary directory: ${tempDir}`);

    // Debug log for GitHub token (masked)
    console.log(
      `GitHub token available: ${process.env.GITHUB_TOKEN ? 'Yes' : 'No'}`
    );
    console.log('******************************');
    if (process.env.GITHUB_TOKEN) {
      console.log(`Token length: ${process.env.GITHUB_TOKEN.length}`);
      console.log(
        `Token prefix: ${process.env.GITHUB_TOKEN.substring(0, 4)}...`
      );
    }

    // Initialize GitHub API client
    octokit = octokit || new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Initialize Git client with GitHub token
    git = git || new GitClient(process.env.GITHUB_TOKEN);

    let files = [];
    let branch = '';
    let repoUrl = '';

    // Check if we're working with a PR or an issue
    const isPullReq = await isPR(octokit, owner, repo, prNumber);

    if (isPullReq) {
      // 1. Get PR details and files
      const { data: pullRequest } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      const { data: prFiles } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
      });

      files = prFiles;
      branch = pullRequest.head.ref;
      repoUrl = pullRequest.head.repo.clone_url;

      // 2. Clone only the specific branch with minimal history
      git.clone(repoUrl, branch);
    } else {
      // For issues, clone the default branch with minimal history
      const { data: repoData } = await octokit.repos.get({
        owner,
        repo,
      });

      branch = repoData.default_branch;
      repoUrl = repoData.clone_url;

      // Clone the repository and create a new branch for the issue
      git.clone(repoUrl, branch);

      const newBranch = `ai-bot/ai-changes-issue-${prNumber}`;
      git.checkoutNewBranch(newBranch);
      branch = newBranch;
    }

    // 3. Get file contents for relevant files
    let additionalFiles = [];

    if (isPullReq && files.length > 0) {
      // If it's a PR, use the files from the PR
      additionalFiles = files
        .filter((file) => file.status !== 'removed')
        .map((file) => file.filename);
    }

    // Process file context directives in the request text
    const fileContents = processFiles({
      text: requestText,
      additionalFiles,
    });

    // 4. Ask AI to analyze the request and determine what changes to make
    const contextContent = `Request: ${requestText}

Files in the PR:
${Object.entries(fileContents)
  .map(([filename, content]) => `--- ${filename} ---\n${content}\n`)
  .join('\n')}`;

    // 5. Parse the AI response to extract search/replace blocks using requestCodeChanges
    const changes = await requestChanges(contextContent, aiClient);
    const searchReplaceBlocks = changes.changes;

    if (searchReplaceBlocks.length === 0) {
      console.log('No search/replace blocks found in AI response');
      throw new Error('No valid search/replace blocks found in AI response');
    }

    // 6. Apply the search/replace blocks to the files with retry logic
    const changedFiles = new Set();
    const explanation = changes.explanation;

    // Apply blocks with retry logic
    let currentBlocks = searchReplaceBlocks;
    currentBlocks = await applyChanges(currentBlocks, changedFiles, aiClient, contextContent);

    // 7. Commit and push the changes
    let commitMessage = await getExplanation(explanation, aiClient);

    // Sanitize the commit message for command line safety
    commitMessage = sanitizeForShell(commitMessage);

    git.addAll();
    git.commit(`${commitMessage}\n\nRequested by comment on PR #${prNumber}`);

    git.push(repoUrl, branch);

    // Return to original directory and clean up
    process.chdir(originalDir);
    console.log(`Cleaning up temporary directory: ${tempDir}`);
    fs.rmSync(tempDir, { recursive: true, force: true });

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
      process.chdir(originalDir);
      fs.rmSync(tempDir, { recursive: true, force: true });
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

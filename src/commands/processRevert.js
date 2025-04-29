import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import handleError from '../utils/errorHandler.js';
import addIssueComment from '../utils/commentUtils.js';
import GitClient from '../utils/gitClient.js';
import { config } from '../config.js';

// Initialize GitHub API client
const octokit = new Octokit({
  auth: config.github.token,
});

/**
 * Process a revert request on a GitHub PR
 */
async function processRevert(aiClient, triggerPhrase, payload) {
  const { prNumber, owner, repo, commentId } = payload;

  try {
    // Get the comment text from GitHub API
    const { data: comment } = await octokit.issues.getComment({
      owner,
      repo,
      comment_id: commentId,
    });

    const commentBody = comment.body;

    // Check if the comment is a revert request
    const revertTrigger = `${triggerPhrase} bot:revert`;
    if (commentBody.trim() !== revertTrigger) {
      console.log('Not a revert request. Skipping.');
      return;
    }

    // Get PR details
    const { data: pullRequest } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    const branchName = pullRequest.head.ref;
    const repoUrl = `https://github.com/${owner}/${repo}.git`;

    // Create a temporary directory for the repository
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'github-revert-'));
    const originalDir = process.cwd();

    try {
      // Change to the temporary directory
      process.chdir(tempDir);
      console.log(`Created temporary directory: ${tempDir}`);

      // Initialize Git client
      const git = new GitClient(config.github.token);

      // Clone the repository with depth 2 to ensure we have enough history for the revert
      git.clone(repoUrl, branchName, '.', { depth: 2 });

      // Revert the last commit using the GitClient
      const lastCommitMsg = git.revertLastCommit({ fetchMoreHistory: true });

      // Push the changes
      git.push(repoUrl, branchName);

      // Comment on the PR with the result
      await addIssueComment({
        octokit,
        owner,
        repo,
        issue_number: prNumber,
        body: `✅ Successfully reverted the previous commit: "${lastCommitMsg}"`,
      });
    } catch (error) {
      console.error('Error during revert operation:', error);
      await addIssueComment({
        octokit,
        owner,
        repo,
        issue_number: prNumber,
        body: `❌ Failed to revert the previous commit: ${error.message}`,
      });
    } finally {
      // Change back to the original directory
      process.chdir(originalDir);

      // Clean up the temporary directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`Removed temporary directory: ${tempDir}`);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary directory:', cleanupError);
      }
    }
  } catch (error) {
    await handleError({
      error,
      octokit,
      owner,
      repo,
      issueNumber: prNumber,
      commentBody,
    });
  }
}

export default processRevert;

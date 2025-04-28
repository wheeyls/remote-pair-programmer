import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import handleError from '../utils/errorHandler.js';
import addIssueComment from '../utils/commentUtils.js';
import GitClient from '../utils/gitClient.js';

// Initialize GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Process a revert request on a GitHub PR
 */
async function processRevert(aiClient, triggerPhrase, payload) {
  const { prNumber, owner, repo, commentBody } = payload;

  try {
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
      const git = new GitClient(process.env.GITHUB_TOKEN);

      // Clone the repository
      git.clone(repoUrl, branchName);
      
      // Get the last commit message for the revert commit message
      const lastCommitMsg = execSync('git log -1 --pretty=%B').toString().trim();
      
      // Revert the last commit
      console.log('Reverting the last commit...');
      execSync('git revert HEAD --no-edit');
      
      // Push the changes
      git.push(repoUrl, branchName);

      // Comment on the PR with the result
      await addIssueComment({
        octokit,
        owner,
        repo,
        issue_number: prNumber,
        body: `✅ Successfully reverted the previous commit: "${lastCommitMsg}"`
      });

    } catch (error) {
      console.error('Error during revert operation:', error);
      await addIssueComment({
        octokit,
        owner,
        repo,
        issue_number: prNumber,
        body: `❌ Failed to revert the previous commit: ${error.message}`
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
      commentBody
    });
  }
}

export default processRevert;

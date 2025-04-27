import { Octokit } from '@octokit/rest';
import processRequest from '../utils/processRequest.js';

// Initialize GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

/**
 * Process a GitHub pull request
 */
async function processPullRequest(aiClient, triggerPhrase) {
  const prNumber = process.env.PR_NUMBER;
  const owner = process.env.REPO_OWNER;
  const repo = process.env.REPO_NAME;

  try {
    // Get PR details
    const { data: pullRequest } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    // Get PR diff
    const { data: diff } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff'
      }
    });

    // Combine PR title and description as the request text
    const requestText = `${pullRequest.title}\n\n${pullRequest.body || ''}`;

    // Process the request using the shared function
    await processRequest({
      aiClient,
      triggerPhrase,
      requestText,
      context: {
        owner,
        repo,
        prNumber,
        diff
      },
      octokit
    });

  } catch (error) {
    console.error('Error processing pull request:', error);
    
    // Post error message as a comment on the PR
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `❌ I encountered an error while processing this PR:\n\`\`\`\n${error.message}\n\`\`\`\n\nPlease try again or contact support.`
    });
    
    throw error;
  }
}

export default processPullRequest;

import { Octokit } from '@octokit/rest';
import processRequest from '../utils/processRequest.js';
import handleError from '../utils/errorHandler.js';

// Initialize GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Process a GitHub pull request
 */
async function processPullRequest(aiClient, triggerPhrase, payload) {
  const { prNumber, owner, repo } = payload;

  try {
    // Get PR details
    const { data: pullRequest } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    // Get PR diff
    const { data: diff } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff',
      },
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
        diff,
      },
      octokit,
    });
  } catch (error) {
    await handleError({
      error,
      octokit,
      owner,
      repo,
      issueNumber: prNumber
    });
    
    throw error;
  }
}

export default processPullRequest;

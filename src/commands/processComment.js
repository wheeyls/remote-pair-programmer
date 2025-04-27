import { Octokit } from '@octokit/rest';
import processRequest from '../utils/processRequest.js';
import handleError from '../utils/errorHandler.js';

// Initialize GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Process a comment on a GitHub PR
 */
async function processComment(aiClient, triggerPhrase, payload) {
  const { commentId, prNumber, owner, repo, commentBody } = payload;

  try {
    // Get PR details to provide context
    const { data: pullRequest } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    // Get PR diff for context
    const { data: diff } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff',
      },
    });

    // Process the request using the shared function
    await processRequest({
      aiClient,
      triggerPhrase,
      requestText: commentBody,
      context: {
        owner,
        repo,
        prNumber,
        diff,
        pullRequest,
      },
      octokit,
    });
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

export default processComment;

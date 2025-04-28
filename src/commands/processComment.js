import { Octokit } from '@octokit/rest';
import processRequest from '../utils/processRequest.js';
import handleError from '../utils/errorHandler.js';
import processRevert from './processRevert.js';

// Initialize GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Process a comment on a GitHub PR
 */
async function processComment(aiClient, triggerPhrase, payload) {
  const { commentId, prNumber, owner, repo } = payload;

  try {
    // Get the comment text from GitHub API
    const { data: comment } = await octokit.issues.getComment({
      owner,
      repo,
      comment_id: commentId,
    });
    
    const commentBody = comment.body;

    // Check if this is a revert request
    if (commentBody.trim() === `${triggerPhrase} bot:revert`) {
      console.log('Detected revert request, calling process-revert handler directly');
      return processRevert(aiClient, triggerPhrase, { owner, repo, prNumber, commentId });
    }

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

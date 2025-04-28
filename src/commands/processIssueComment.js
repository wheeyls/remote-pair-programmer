import { Octokit } from '@octokit/rest';
import processRequest from '../utils/processRequest.js';
import handleError from '../utils/errorHandler.js';
import addIssueComment from '../utils/commentUtils.js';

// Initialize GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Process a comment on a GitHub issue
 */
async function processIssueComment(aiClient, triggerPhrase, payload) {
  const { commentId, issueNumber, owner, repo } = payload;

  try {
    // Get the comment text from GitHub API
    const { data: comment } = await octokit.issues.getComment({
      owner,
      repo,
      comment_id: commentId,
    });

    const commentBody = comment.body;

    // Check if this comment contains the trigger phrase
    if (!commentBody.includes(triggerPhrase)) {
      console.log('Comment does not contain trigger phrase. Skipping.');
      return;
    }

    // Get issue details to provide context
    const { data: issue } = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    // Process the request using the shared function
    await processRequest({
      aiClient,
      triggerPhrase,
      requestText: commentBody,
      context: {
        owner,
        repo,
        issue,
        prNumber: issueNumber,
      },
      octokit,
    });
  } catch (error) {
    await handleError({
      error,
      octokit,
      owner,
      repo,
      issueNumber,
    });
  }
}

export default processIssueComment;

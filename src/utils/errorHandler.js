import { Octokit } from '@octokit/rest';
import addIssueComment from './commentUtils.js';

/**
 * Shared error handler for GitHub API operations
 * @param {Object} params - Error handling parameters
 * @param {Error} params.error - The error that occurred
 * @param {Object} [params.octokit] - Optional Octokit instance
 * @param {string} params.owner - Repository owner
 * @param {string} params.repo - Repository name
 * @param {number} params.issueNumber - PR or issue number
 * @param {number} [params.commentId] - Optional comment ID for review comment replies
 * @param {string} [params.commentBody] - Optional original comment body for context
 * @param {boolean} [params.isReviewComment=false] - Whether this is a review comment
 * @returns {Promise<void>}
 */
async function handleError({
  error,
  octokit,
  owner,
  repo,
  issueNumber,
  commentId,
  commentBody,
  isReviewComment = false
}) {
  console.error('Error processing request:', error);
  const safeErrorMessage = protectSensitiveData(error.message);

  const errorMessage = `❌ I encountered an error while processing your request:\n\`\`\`\n${safeErrorMessage}\n\`\`\`\n\nPlease try again or rephrase your request.`;
  
  try {
    await addIssueComment({
      octokit,
      type: isReviewComment ? 'pull' : 'issue',
      owner,
      repo,
      issue_number: issueNumber,
      comment_id: commentId,
      body: errorMessage,
      quote_reply_to: commentBody
    });
  } catch (commentError) {
    // If commenting fails, log the error but don't throw
    console.error('Error posting error comment:', commentError);
  }
}

function protectSensitiveData(message) {
  // Example: Mask sensitive data in the error message
  const sensitiveDataPattern = /https:\/\/(.+)@/g;
  return message.replace(sensitiveDataPattern, '***');
}

export default handleError;

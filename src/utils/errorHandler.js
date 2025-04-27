import { Octokit } from '@octokit/rest';

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

  // Initialize Octokit if not provided
  if (!octokit) {
    octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }

  const errorMessage = `❌ I encountered an error while processing your request:\n\`\`\`\n${error.message}\n\`\`\`\n\nPlease try again or rephrase your request.`;
  
  // Add bot:ignore directive to prevent the bot from responding to its own messages
  const messageWithIgnore = errorMessage + '\n\nbot:ignore';
  
  try {
    if (isReviewComment && commentId) {
      // Reply to a review comment
      await octokit.pulls.createReplyForReviewComment({
        owner,
        repo,
        pull_number: issueNumber,
        comment_id: commentId,
        body: messageWithIgnore,
      });
    } else {
      // Reply to a regular issue/PR comment
      const body = commentBody 
        ? `> ${commentBody}\n\n${messageWithIgnore}`
        : messageWithIgnore;
        
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: body,
      });
    }
  } catch (commentError) {
    // If commenting fails, log the error but don't throw
    console.error('Error posting error comment:', commentError);
  }
}

export default handleError;

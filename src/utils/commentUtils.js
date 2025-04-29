import { Octokit } from '@octokit/rest';
import { config } from '../config.js';

/**
 * Shared utility for creating GitHub comments
 * @param {Object} params - Comment parameters
 * @param {Object} [params.octokit] - Optional Octokit instance
 * @param {string} params.type - Comment type: 'issue' or 'pull'
 * @param {string} params.owner - Repository owner
 * @param {string} params.repo - Repository name
 * @param {number} params.issue_number - Issue number (for issue comments)
 * @param {number} params.pr_number - PR number (for PR comments)
 * @param {number} [params.comment_id] - Comment ID (for review comment replies)
 * @param {string} params.body - Comment body
 * @param {boolean} [params.quote_reply_to] - Whether to quote the original comment in the reply
 * @returns {Promise<Object>} - The created comment
 */
async function addIssueComment({
  octokit,
  type = 'issue',
  owner,
  repo,
  issue_number,
  pr_number,
  comment_id,
  body,
  quote_reply_to,
}) {
  // Initialize Octokit if not provided
  if (!octokit) {
    octokit = new Octokit({
      auth: config.github.token,
    });
  }

  // Add bot:ignore directive to prevent the bot from responding to its own messages
  const messageWithIgnore = body + '\n\nbot:ignore';

  try {
    if (type === 'pull' && comment_id) {
      // Reply to a review comment
      return await octokit.pulls.createReplyForReviewComment({
        owner,
        repo,
        pull_number: pr_number || issue_number, // Support both parameter names
        comment_id,
        body: messageWithIgnore,
      });
    } else {
      // For regular issue/PR comments
      const finalBody = quote_reply_to
        ? `> ${quote_reply_to}\n\n${messageWithIgnore}`
        : messageWithIgnore;

      return await octokit.issues.createComment({
        owner,
        repo,
        issue_number: pr_number || issue_number, // Support both parameter names
        body: finalBody,
      });
    }
  } catch (commentError) {
    console.error('Error posting comment:', commentError);
    throw commentError;
  }
}

export default addIssueComment;

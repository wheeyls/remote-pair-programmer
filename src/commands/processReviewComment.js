import { Octokit } from '@octokit/rest';
import processRequest from '../utils/processRequest.js';

// Initialize GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

/**
 * Process a review comment on a specific line in a GitHub PR
 */
async function processReviewComment(aiClient, triggerPhrase, payload) {
  const { commentId, prNumber, owner, repo, commentBody } = payload;
  
  try {
    // Get PR details to provide context
    const { data: pullRequest } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    // Get PR diff for context
    const { data: diff } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff'
      }
    });
    
    // Get the review comment details
    const { data: reviewComment } = await octokit.pulls.getReviewComment({
      owner,
      repo,
      comment_id: commentId
    });
    
    // Add review comment specific context
    const reviewContext = {
      path: reviewComment.path,
      line: reviewComment.line,
      diff_hunk: reviewComment.diff_hunk,
      position: reviewComment.position,
      commit_id: reviewComment.commit_id
    };

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
        reviewComment: reviewContext
      },
      octokit
    });
  } catch (error) {
    console.error('Error processing review comment:', error);
    
    // Post error message as a reply
    await octokit.pulls.createReplyForReviewComment({
      owner,
      repo,
      pull_number: prNumber,
      comment_id: commentId,
      body: `❌ I encountered an error while processing your request:\n\`\`\`\n${error.message}\n\`\`\`\n\nPlease try again or rephrase your request.`
    });
  }
}

export default processReviewComment;

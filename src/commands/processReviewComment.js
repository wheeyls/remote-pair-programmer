import { getOctokit } from '../providers/octokitProvider.js';
import processRequest from '../utils/processRequest.js';
import handleError from '../utils/errorHandler.js';
import { config } from '../config.js';
import { PRHelper } from '../github/prHelper.js';

/**
 * Process a review comment on a specific line in a GitHub PR
 */
async function processReviewComment(aiClient, triggerPhrase, payload) {
  const { commentId, prNumber, owner, repo } = payload;
  const octokit = getOctokit();

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

    const prHelper = new PRHelper({
      octokit,
      owner,
      repo,
      prNumber,
      reviewCommentId: commentId,
    });
    const prContext = await prHelper.toContext();

    await processRequest({
      aiClient,
      triggerPhrase,
      requestText: prContext.reviewComment ? prContext.reviewComment.body : '',
      context: prContext,
      octokit,
      prHelper,
    });
  } catch (error) {
    await handleError({
      error,
      octokit,
      owner,
      repo,
      issueNumber: prNumber,
      commentId,
      isReviewComment: true,
    });
  }
}

export default processReviewComment;

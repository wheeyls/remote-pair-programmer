import { getOctokit } from '../providers/octokitProvider.js';
import processRequest from '../utils/processRequest.js';
import handleError from '../utils/errorHandler.js';
import addIssueComment from '../utils/commentUtils.js';
import { config } from '../config.js';

/**
 * Process a comment on a GitHub issue
 */
async function processIssueComment(aiClient, triggerPhrase, payload) {
  const { commentId, issueNumber, owner, repo } = payload;
  const octokit = getOctokit();

  try {
    // Get the comment text from GitHub API
    const { data: comment } = await octokit.issues.getComment({
      owner,
      repo,
      comment_id: commentId,
    });

    const commentBody = comment.body;

    // Get issue details to provide context
    const { data: issue } = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    // Process the request using the shared function
    const result = await processRequest({
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

    // If there's a branch created, leave a comment with a link to it
    if (result && result.branchName) {
      const baseBranch = 'main'; // Assuming main is the default branch
      await addIssueComment({
        octokit,
        owner,
        repo,
        issue_number: issueNumber,
        body: `✅ I've made the requested changes and pushed them to the branch \`${result.branchName}\`.\n\n**Changes made:**\n${
          result.explanation || 'Code changes as requested'
        }\n\n**Modified files:**\n${(result.changedFiles || [])
          .map((f) => `- \`${f}\``)
          .join(
            '\n'
          )}\n\nYou can create a PR from this branch manually or use the following URL:\nhttps://github.com/${owner}/${repo}/compare/${baseBranch}...${result.branchName}?expand=1`,
      });
    }
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

const { Octokit } = require('@octokit/rest');
const processRequest = require('../utils/processRequest');

// Initialize GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

/**
 * Process a comment on a GitHub PR
 */
async function processComment(aiClient, triggerPhrase) {
  const commentId = process.env.COMMENT_ID;
  const prNumber = process.env.PR_NUMBER;
  const owner = process.env.REPO_OWNER;
  const repo = process.env.REPO_NAME;
  const commentBody = process.env.COMMENT_BODY;

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
        pullRequest
      },
      octokit
    });
  } catch (error) {
    console.error('Error processing comment:', error);
    
    // Post error message as a reply
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `> ${commentBody}\n\n❌ I encountered an error while processing your request:\n\`\`\`\n${error.message}\n\`\`\`\n\nPlease try again or rephrase your request.`
    });
  }
}

module.exports = processComment;

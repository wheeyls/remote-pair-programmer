const { Octokit } = require('@octokit/rest');

// Initialize GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

/**
 * Process a GitHub pull request
 */
async function processPullRequest(aiClient) {
  const prNumber = process.env.PR_NUMBER;
  const owner = process.env.REPO_OWNER;
  const repo = process.env.REPO_NAME;

  try {
    // Get PR details
    const { data: pullRequest } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    // Get PR diff
    const { data: diff } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff'
      }
    });

    // Generate AI response based on PR content
    const aiResponse = await generateAIResponse(aiClient, {
      title: pullRequest.title,
      description: pullRequest.body,
      diff: diff
    });

    // Post comment on PR
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: aiResponse
    });

  } catch (error) {
    console.error('Error processing pull request:', error);
    throw error;
  }
}

/**
 * Generate an AI response
 */
async function generateAIResponse(aiClient, context, promptType = 'PR_REVIEW', modelStrength = 'strong') {
  try {
    const PROMPTS = require('../prompts');
    return await aiClient.generateCompletion({
      prompt: PROMPTS[promptType],
      context: context,
      modelStrength: modelStrength,
      temperature: 0.7
    });
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}

module.exports = processPullRequest;

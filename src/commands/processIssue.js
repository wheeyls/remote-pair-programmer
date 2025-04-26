const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');
const { modifyCode } = require('../codeChanges');

// Initialize GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

/**
 * Process a GitHub issue and convert it to a PR with code changes
 */
async function processIssue(aiClient, triggerPhrase) {
  const issueNumber = process.env.PR_NUMBER; // This will be the issue number in this context
  const owner = process.env.REPO_OWNER;
  const repo = process.env.REPO_NAME;

  try {
    // Get issue details
    const { data: issue } = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber
    });

    const issueBody = issue.body || '';
    const issueTitle = issue.title || '';

    // Check if this issue contains the trigger phrase
    if (!issueTitle.includes(triggerPhrase) && !issueBody.includes(triggerPhrase)) {
      console.log(triggerPhrase);
      console.log(issueBody);
      console.log(issueTitle);
      console.log('Issue does not contain trigger phrase. Skipping.');
      console.log(JSON.stringify(issue));
      return;
    }

    // Comment that we're processing the request
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: `I'm processing your request to make code changes. I'll convert this issue into a PR shortly.`
    });

    // Create a new branch for the changes
    const baseBranch = 'main'; // Assuming main is the default branch
    const newBranch = `ai-changes-issue-${issueNumber}`;
    
    // Get the SHA of the latest commit on the base branch
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`
    });
    const sha = refData.object.sha;
    
    // Create a new branch
    try {
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${newBranch}`,
        sha
      });
    } catch (error) {
      // If branch already exists, we'll just use it
      console.log(`Branch ${newBranch} already exists or couldn't be created: ${error.message}`);
    }
    
    // Checkout the new branch locally
    try {
      execSync(`git fetch origin ${newBranch} || git fetch origin ${baseBranch}`);
      execSync(`git checkout ${newBranch} || git checkout -b ${newBranch} origin/${baseBranch}`);
    } catch (error) {
      console.error(`Error checking out branch: ${error.message}`);
      throw error;
    }

    // Make the requested changes
    const result = await modifyCode({
      owner,
      repo,
      prNumber: issueNumber, // Using issue number as context
      requestText: `${issueTitle}\n\n${issueBody}`,
      aiClient: aiClient
    });

    if (!result.success) {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: `❌ I encountered an error while trying to make the requested changes:\n\`\`\`\n${result.error}\n\`\`\`\n\nPlease provide more details or try a different request.`
      });
      return;
    }

    // Convert the issue to a PR using the GitHub API
    // This requires using the GraphQL API as the REST API doesn't support this directly
    const query = `
      mutation {
        convertToDraft(input: {
          repositoryId: "${issue.repository_id}",
          issueId: "${issue.node_id}"
        }) {
          pullRequest {
            id
            number
          }
        }
      }
    `;

    // Execute the GraphQL query
    const graphqlResponse = await octokit.graphql(query);
    const prNumber = graphqlResponse.convertToDraft.pullRequest.number;
    
    // Update the PR with the correct head and base branches
    await octokit.pulls.update({
      owner,
      repo,
      pull_number: prNumber,
      title: `AI: ${result.explanation}`,
      body: `**Changes made:**\n${result.explanation}\n\n**Modified files:**\n${result.changedFiles.map(f => `- \`${f}\``).join('\n')}`,
      head: newBranch,
      base: baseBranch
    });

    // Comment on the PR with details about the changes
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `✅ I've converted this issue into a PR and made the requested changes.\n\n**Changes made:**\n${result.explanation}\n\n**Modified files:**\n${result.changedFiles.map(f => `- \`${f}\``).join('\n')}`
    });

  } catch (error) {
    console.error('Error processing issue:', error);
    
    // Post error message as a comment on the issue
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: `❌ I encountered an error while processing your request:\n\`\`\`\n${error.message}\n\`\`\`\n\nPlease try again or rephrase your request.`
    });
  }
}

module.exports = processIssue;

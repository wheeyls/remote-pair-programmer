import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import { modifyCode } from '../codeChanges.js';

// Initialize GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Process a GitHub issue and convert it to a PR with code changes
 */
async function processIssue(aiClient, triggerPhrase, payload) {
  const { issueNumber, owner, repo } = payload;

  try {
    // Get issue details
    const { data: issue } = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    const issueBody = issue.body || '';
    const issueTitle = issue.title || '';

    // Check if this issue contains the trigger phrase
    if (
      !issueTitle.includes(triggerPhrase) &&
      !issueBody.includes(triggerPhrase)
    ) {
      console.log('Issue does not contain trigger phrase. Skipping.');
      console.log(JSON.stringify(issue));
      return;
    }

    // Comment that we're processing the request
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: `I'm processing your request to make code changes. I'll convert this issue into a PR shortly.`,
    });

    // Create a new branch for the changes
    const baseBranch = 'main'; // Assuming main is the default branch
    const newBranch = `ai-changes-issue-${issueNumber}`;

    // Get the SHA of the latest commit on the base branch
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });
    const sha = refData.object.sha;

    // Create a new branch
    try {
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${newBranch}`,
        sha,
      });
    } catch (error) {
      // If branch already exists, we'll just use it
      console.log(
        `Branch ${newBranch} already exists or couldn't be created: ${error.message}`
      );
    }

    // Checkout the new branch locally
    try {
      execSync(
        `git fetch origin ${newBranch} || git fetch origin ${baseBranch}`
      );
      execSync(
        `git checkout ${newBranch} || git checkout -b ${newBranch} origin/${baseBranch}`
      );
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
      aiClient: aiClient,
    });

    if (!result.success) {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: `❌ I encountered an error while trying to make the requested changes:\n\`\`\`\n${result.error}\n\`\`\`\n\nPlease provide more details or try a different request.`,
      });
      return;
    }

    // Instead of creating a PR, just push the changes to the branch and comment on the issue
    // This avoids the GitHub Actions permission limitation for creating PRs

    // Comment on the issue with information about the changes and branch
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: `✅ I've made the requested changes and pushed them to the branch \`${newBranch}\`.\n\n**Changes made:**\n${
        result.explanation
      }\n\n**Modified files:**\n${result.changedFiles
        .map((f) => `- \`${f}\``)
        .join(
          '\n'
        )}\n\nYou can create a PR from this branch manually or use the following URL:\nhttps://github.com/${owner}/${repo}/compare/${baseBranch}...${newBranch}?expand=1`,
    });
  } catch (error) {
    console.error('Error processing issue:', error);

    // Post error message as a comment on the issue
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: `❌ I encountered an error while processing your request:\n\`\`\`\n${error.message}\n\`\`\`\n\nPlease try again or rephrase your request.`,
    });
  }
}

export default processIssue;

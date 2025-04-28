import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import { modifyCode } from '../codeChanges.js';
import handleError from '../utils/errorHandler.js';
import addIssueComment from '../utils/commentUtils.js';

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
    await addIssueComment({
      octokit,
      owner,
      repo,
      issue_number: issueNumber,
      body: `I'm processing your request to make code changes. I'll convert this issue into a PR shortly.`
    });

    // Create a new branch for the changes
    const baseBranch = 'main'; // Assuming main is the default branch
    const newBranch = `ai-bot/ai-changes-issue-${issueNumber}`;

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

    // We don't need to checkout the branch locally here anymore
    // The modifyCode function will handle cloning the repository

    // Make the requested changes
    const result = await modifyCode({
      owner,
      repo,
      prNumber: issueNumber, // Using issue number as context
      requestText: `${issueTitle}\n\n${issueBody}`,
      aiClient: aiClient,
    });

    if (!result.success) {
      await addIssueComment({
        octokit,
        owner,
        repo,
        issue_number: issueNumber,
        body: `❌ I encountered an error while trying to make the requested changes:\n\`\`\`\n${result.error}\n\`\`\`\n\nPlease provide more details or try a different request.`
      });
      return;
    }

    // Instead of creating a PR, just push the changes to the branch and comment on the issue
    // This avoids the GitHub Actions permission limitation for creating PRs

    // Comment on the issue with information about the changes and branch
    await addIssueComment({
      octokit,
      owner,
      repo,
      issue_number: issueNumber,
      body: `✅ I've made the requested changes and pushed them to the branch \`${newBranch}\`.\n\n**Changes made:**\n${
        result.explanation
      }\n\n**Modified files:**\n${result.changedFiles
        .map((f) => `- \`${f}\``)
        .join(
          '\n'
        )}\n\nYou can create a PR from this branch manually or use the following URL:\nhttps://github.com/${owner}/${repo}/compare/${baseBranch}...${newBranch}?expand=1`
    });
  } catch (error) {
    await handleError({
      error,
      octokit,
      owner,
      repo,
      issueNumber
    });
  }
}

export default processIssue;

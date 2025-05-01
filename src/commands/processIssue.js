import { getOctokit } from '../providers/octokitProvider.js';
import processRequest from '../utils/processRequest.js';
import handleError from '../utils/errorHandler.js';
import addIssueComment from '../utils/commentUtils.js';
import { PRHelper } from '../github/prHelper.js';
import { config } from '../config.js';

/**
 * Process a GitHub issue and convert it to a PR with code changes
 */
async function processIssue(aiClient, triggerPhrase, payload) {
  const { issueNumber, owner, repo } = payload;
  const octokit = getOctokit();
  const pr = new PRHelper({ octokit, owner, repo, prNumber: issueNumber });

  try {
    await pr.addReaction();
    // Get issue details
    const issue = await pr.getIssueDetails();

    const issueBody = issue.body || '';
    const issueTitle = issue.title || '';

    // Combine issue title and body as the request text
    const requestText = `${issueTitle}\n\n${issueBody}`;

    // Process the request using the shared function
    const result = await processRequest({
      aiClient,
      triggerPhrase,
      requestText,
      prHelper: pr,
      context: {
        owner,
        repo,
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

export default processIssue;

/**
 * Check if the given number refers to a PR or an issue
 * @param {Object} octokit - Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} number - PR or issue number
 * @returns {Promise<boolean>} - True if it's a PR, false if it's an issue
 */
async function isPullRequest(octokit, owner, repo, number) {
  try {
    await octokit.pulls.get({
      owner,
      repo,
      pull_number: number,
    });
    return true;
  } catch (error) {
    return false;
  }
}

export { isPullRequest };

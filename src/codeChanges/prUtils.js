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
    // Make sure we have a valid number
    if (!number) {
      return false;
    }
    
    // First, try to get the issue to check if it exists
    const { data } = await octokit.issues.get({
      owner,
      repo,
      issue_number: number,
    });
    
    // Handle the response based on its type
    let issue;
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return false;
      }
      issue = data[0];
    } else {
      issue = data;
    }
    
    // Check for the pull_request property which indicates it's a PR
    return issue.pull_request !== undefined;
  } catch (error) {
    console.error(`Error checking if #${number} is a PR:`, error);
    // If we can't get the issue at all, return false
    return false;
  }
}

export { isPullRequest };

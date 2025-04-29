import { execSync } from 'child_process';
import { config } from '../config.js';

/**
 * A utility class for Git operations
 */
class GitClient {
  /**
   * Create a new GitClient
   * @param {string} token - GitHub token for authentication (defaults to config.github.token)
   */
  constructor(token = config.github.token) {
    this.token = token;
  }

  /**
   * Clone a repository
   * @param {string} repoUrl - Repository URL
   * @param {string} branch - Branch name
   * @param {string} destination - Destination path (defaults to current directory)
   * @param {Object} options - Additional options
   * @param {number} options.depth - Depth of history to clone (defaults to 1)
   */
  clone(repoUrl, branch, destination = '.', options = {}) {
    const { depth = 1 } = options;
    const tokenUrl = this._getAuthenticatedUrl(repoUrl, this.token);
    console.log(`Cloning repository branch ${branch} with depth ${depth}...`);
    execSync(
      `git clone --depth ${depth} --branch ${branch} "${tokenUrl}" ${destination}`
    );
  }

  /**
   * Configure git user
   * @param {string} name - Git user name
   * @param {string} email - Git user email
   */
  configureUser(name, email) {
    execSync(`git config user.name "${name}"`);
    execSync(`git config user.email "${email}"`);
  }

  /**
   * Create and checkout a new branch
   * @param {string} branchName - Name of the new branch
   */
  checkoutNewBranch(branchName) {
    console.log(`Creating new branch: ${branchName}`);
    execSync(`git checkout -b ${branchName}`);
  }

  /**
   * Add all changes to git staging
   */
  addAll() {
    execSync('git add .');
  }

  /**
   * Commit changes
   * @param {string} message - Commit message
   */
  commit(message) {
    this.configureUser(
      'GitHub AI Actions',
      'github-actions[bot]@users.noreply.github.com'
    );

    execSync(`git commit -m "${message}"`);
  }

  /**
   * Push changes to remote
   * @param {string} repoUrl - Repository URL
   * @param {string} branch - Branch name
   */
  push(repoUrl, branch) {
    const tokenUrl = this._getAuthenticatedUrl(repoUrl, this.token);
    console.log(`Pushing changes to branch ${branch}...`);
    execSync(`git push ${tokenUrl} ${branch}`);
  }

  /**
   * Revert the last commit
   * @param {Object} options - Additional options
   * @param {boolean} options.fetchMoreHistory - Whether to fetch more history if needed (defaults to false)
   * @returns {string} The reverted commit message
   */
  revertLastCommit(options = {}) {
    const { fetchMoreHistory = false } = options;
    
    // Configure user before reverting
    this.configureUser(
      'GitHub AI Actions',
      'github-actions[bot]@users.noreply.github.com'
    );
    
    // Get the last commit message for the revert commit message
    const lastCommitMsg = execSync('git log -1 --pretty=%B').toString().trim();
    
    // If fetchMoreHistory is true, deepen the clone to ensure we have enough history
    if (fetchMoreHistory) {
      console.log('Fetching more history to support revert...');
      execSync('git fetch --deepen=1');
    }
    
    // Revert the last commit
    console.log('Reverting the last commit...');
    execSync('git revert HEAD --no-edit');
    
    return lastCommitMsg;
  }

  /**
   * Get authenticated URL for git operations
   * @param {string} repoUrl - Repository URL
   * @param {string} token - GitHub token
   * @returns {string} - URL with token authentication
   * @private
   */
  _getAuthenticatedUrl(repoUrl, token) {
    return repoUrl.replace('https://', `https://x-access-token:${token}@`);
  }
}

export default GitClient;

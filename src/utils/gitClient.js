import { execSync } from 'child_process';

/**
 * A utility class for Git operations
 */
class GitClient {
  /**
   * Create a new GitClient
   * @param {string} token - GitHub token for authentication (defaults to GITHUB_TOKEN env variable)
   */
  constructor(token = process.env.GITHUB_TOKEN) {
    this.token = token;
  }

  /**
   * Clone a repository
   * @param {string} repoUrl - Repository URL
   * @param {string} branch - Branch name
   * @param {string} destination - Destination path (defaults to current directory)
   */
  clone(repoUrl, branch, destination = '.') {
    const tokenUrl = this._getAuthenticatedUrl(repoUrl, this.token);
    console.log(
      `Cloning repository ${repoUrl.replace(
        /\/\/.*@/,
        '//***@'
      )} branch ${branch}...`
    );
    execSync(
      `git clone --depth 1 --branch ${branch} "${tokenUrl}" ${destination}`
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
   * @returns {string} The reverted commit message
   */
  revertLastCommit() {
    // Configure user before reverting
    this.configureUser(
      'GitHub AI Actions',
      'github-actions[bot]@users.noreply.github.com'
    );
    
    // Get the last commit message for the revert commit message
    const lastCommitMsg = execSync('git log -1 --pretty=%B').toString().trim();
    
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

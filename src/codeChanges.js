const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const PROMPTS = require('./prompts');
const AIClient = require('./aiClient');
const { processFileContext } = require('./utils/fileContext');

// Initialize GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

/**
 * Analyzes a request to modify code and makes the requested changes
 * @param {Object} params - Parameters for code modification
 * @param {string} params.owner - Repository owner
 * @param {string} params.repo - Repository name
 * @param {number} params.prNumber - Pull request number
 * @param {string} params.requestText - The text of the request to modify code
 * @param {Object} params.aiClient - AIClient instance
 * @returns {Object} - Result of the code modification operation
 */
async function modifyCode({ owner, repo, prNumber, requestText, aiClient }) {
  try {
    let files = [];
    let branch = '';
    
    // Check if we're working with a PR or an issue
    const isPR = await isPullRequest(owner, repo, prNumber);
    
    if (isPR) {
      // 1. Get PR details and files
      const { data: pullRequest } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber
      });
      
      const { data: prFiles } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber
      });
      
      files = prFiles;
      branch = pullRequest.head.ref;
      
      // 2. Checkout the PR branch
      execSync(`git fetch origin ${branch} && git checkout ${branch}`);
    }
    // If it's an issue, we're already on the correct branch from the caller
    
    // 3. Get file contents for relevant files
    let baseFiles = [];
    
    if (isPR && files.length > 0) {
      // If it's a PR, use the files from the PR
      baseFiles = files.filter(file => file.status !== 'removed').map(file => file.filename);
    } else {
      // If it's an issue or an empty PR, get all files in the repo
      // This is a simplified approach - in a real implementation, you might want to be more selective
      baseFiles = getAllRepoFiles().filter(file => 
        file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || 
        file.endsWith('.tsx') || file.endsWith('.json') || file.endsWith('.md') ||
        file.endsWith('.css') || file.endsWith('.html')
      );
    }
    
    // Process file context directives in the request text
    const fileContents = processFileContext(requestText, baseFiles);
    
    // 4. Ask AI to analyze the request and determine what changes to make
    const contextContent = `Request: ${requestText}
          
Files in the PR:
${Object.entries(fileContents).map(([filename, content]) => 
  `--- ${filename} ---\n${content}\n`
).join('\n')}`;

    const aiResponse = await aiClient.generateCompletion({
      prompt: PROMPTS.CODE_MODIFICATION,
      context: contextContent,
      modelStrength: 'strong', // Use strong model for code modifications
      temperature: 0.2,
      responseFormat: { type: "json_object" }
    });
    
    // 5. Parse the AI response
    let modifications;
    try {
      // The response might already be a JSON string from the tool use
      modifications = typeof aiResponse === 'object' ? aiResponse : JSON.parse(aiResponse);
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      console.log('Raw response:', aiResponse);
      throw new Error(`Failed to parse AI response as JSON: ${error.message}`);
    }
    
    // 6. Apply the changes to the files
    for (const change of modifications.changes) {
      const filename = change.filename;
      let content = fileContents[filename] || '';
      
      // Apply operations in reverse order to avoid line number shifts
      const sortedOperations = [...change.operations].sort((a, b) => b.lineStart - a.lineStart);
      
      for (const op of sortedOperations) {
        if (op.type === 'replace') {
          const lines = content.split('\n');
          const beforeLines = lines.slice(0, op.lineStart - 1);
          const afterLines = lines.slice(op.lineEnd);
          const newLines = op.content.split('\n');
          content = [...beforeLines, ...newLines, ...afterLines].join('\n');
        }
      }
      
      // Ensure directory exists
      const dir = path.dirname(filename);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write the modified content back to the file
      fs.writeFileSync(filename, content, 'utf8');
    }
    
    // 7. Commit and push the changes
    let commitMessage = `AI: ${modifications.explanation}
    
Requested by comment on PR #${prNumber}`;
    
    // Sanitize the commit message for command line safety
    commitMessage = sanitizeForShell(commitMessage);
    
    execSync('git config user.name "GitHub AI Actions"');
    execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
    execSync('git add .');
    execSync(`git commit -m "${commitMessage}"`);
    execSync(`git push origin ${branch}`);
    
    return {
      success: true,
      explanation: modifications.explanation,
      changedFiles: modifications.changes.map(c => c.filename)
    };
  } catch (error) {
    console.error('Error modifying code:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if the given number refers to a PR or an issue
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} number - PR or issue number
 * @returns {Promise<boolean>} - True if it's a PR, false if it's an issue
 */
async function isPullRequest(owner, repo, number) {
  try {
    await octokit.pulls.get({
      owner,
      repo,
      pull_number: number
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Sanitize a string for safe use in shell commands
 * @param {string} str - The string to sanitize
 * @returns {string} - Sanitized string safe for shell command usage
 */
function sanitizeForShell(str) {
  // Replace double quotes with escaped double quotes
  // Remove any characters that could cause command injection
  return str
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/[&|;()<>]/g, '')
    .replace(/\n/g, ' ');
}

/**
 * Get all files in the repository
 * @returns {Array<string>} - Array of file paths
 */
function getAllRepoFiles() {
  try {
    // Use git to list all tracked files
    const result = execSync('git ls-files').toString().trim();
    return result.split('\n');
  } catch (error) {
    console.error('Error getting repo files:', error);
    return [];
  }
}

module.exports = {
  modifyCode
};

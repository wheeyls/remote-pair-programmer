const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const PROMPTS = require('./prompts');
const AIClient = require('./aiClient');

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
 * @param {Object} params.openai - OpenAI client instance
 * @returns {Object} - Result of the code modification operation
 */
async function modifyCode({ owner, repo, prNumber, requestText, openai }) {
  try {
    // 1. Get PR details and files
    const { data: pullRequest } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });
    
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber
    });
    
    // 2. Checkout the PR branch
    const branch = pullRequest.head.ref;
    execSync(`git fetch origin ${branch} && git checkout ${branch}`);
    
    // 3. Get file contents for relevant files
    const fileContents = {};
    for (const file of files) {
      if (file.status !== 'removed') {
        try {
          const content = fs.readFileSync(file.filename, 'utf8');
          fileContents[file.filename] = content;
        } catch (err) {
          console.warn(`Could not read file ${file.filename}: ${err.message}`);
        }
      }
    }
    
    // Create AI client for this request
    const aiClient = new AIClient({
      apiKey: process.env.AI_API_KEY || openai.apiKey
    });
    
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
    const modifications = JSON.parse(aiResponse);
    
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
    const commitMessage = `AI: ${modifications.explanation}
    
Requested by comment on PR #${prNumber}`;
    
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

module.exports = {
  modifyCode
};

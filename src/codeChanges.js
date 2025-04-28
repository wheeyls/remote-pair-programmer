import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import PROMPTS from './prompts.js';
import { AIClient } from './aiClient.js';
import { processFileContext } from './utils/fileContext.js';
import GitClient from './utils/gitClient.js';

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
  console.log('MODIFY CODE IS ENTERED');
  // Create a temporary directory for the repository
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'github-ai-'));
  const originalDir = process.cwd();

  try {
    console.log('******************************');
    process.chdir(tempDir);
    console.log(`Created temporary directory: ${tempDir}`);

    // Debug log for GitHub token (masked)
    console.log(
      `GitHub token available: ${process.env.GITHUB_TOKEN ? 'Yes' : 'No'}`
    );
    console.log('******************************');
    if (process.env.GITHUB_TOKEN) {
      console.log(`Token length: ${process.env.GITHUB_TOKEN.length}`);
      console.log(
        `Token prefix: ${process.env.GITHUB_TOKEN.substring(0, 4)}...`
      );
    }

    // Initialize GitHub API client
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Initialize Git client with GitHub token
    const git = new GitClient(process.env.GITHUB_TOKEN);

    let files = [];
    let branch = '';
    let repoUrl = '';

    // Check if we're working with a PR or an issue
    const isPR = await isPullRequest(octokit, owner, repo, prNumber);

    if (isPR) {
      // 1. Get PR details and files
      const { data: pullRequest } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      const { data: prFiles } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
      });

      files = prFiles;
      branch = pullRequest.head.ref;
      repoUrl = pullRequest.head.repo.clone_url;

      // 2. Clone only the specific branch with minimal history
      git.clone(repoUrl, branch);
    } else {
      // For issues, clone the default branch with minimal history
      const { data: repoData } = await octokit.repos.get({
        owner,
        repo,
      });

      branch = repoData.default_branch;
      repoUrl = repoData.clone_url;

      // Clone the repository and create a new branch for the issue
      git.clone(repoUrl, branch);

      const newBranch = `ai-bot/ai-changes-issue-${prNumber}`;
      git.checkoutNewBranch(newBranch);
      branch = newBranch;
    }

    // 3. Get file contents for relevant files
    let additionalFiles = [];

    if (isPR && files.length > 0) {
      // If it's a PR, use the files from the PR
      additionalFiles = files
        .filter((file) => file.status !== 'removed')
        .map((file) => file.filename);
    }

    // Process file context directives in the request text
    const fileContents = processFileContext({
      text: requestText,
      additionalFiles,
    });

    // 4. Ask AI to analyze the request and determine what changes to make
    const contextContent = `Request: ${requestText}

Files in the PR:
${Object.entries(fileContents)
  .map(([filename, content]) => `--- ${filename} ---\n${content}\n`)
  .join('\n')}`;

    // 5. Parse the AI response to extract search/replace blocks using requestCodeChanges
    const changes = await requestCodeChanges(contextContent, aiClient);
    const searchReplaceBlocks = changes.changes;

    if (searchReplaceBlocks.length === 0) {
      console.log('No search / replace in:' + aiResponse);
      throw new Error('No valid search/replace blocks found in AI response');
    }

    // 6. Apply the search/replace blocks to the files with retry logic
    const changedFiles = new Set();
    const explanation = changes.explanation;

    // Apply blocks with retry logic
    let currentBlocks = searchReplaceBlocks;
    currentBlocks = await applyPatches(currentBlocks, changedFiles, aiClient);

    // 7. Commit and push the changes
    let commitMessage = getRefinedExplanation(explanation, aiClient);

    // Sanitize the commit message for command line safety
    commitMessage = sanitizeForShell(
      `${commitMessage}\n\nRequested by comment on PR #${prNumber}`
    );

    git.addAll();
    git.commit(commitMessage);
    git.push(repoUrl, branch);

    // Return to original directory and clean up
    process.chdir(originalDir);
    console.log(`Cleaning up temporary directory: ${tempDir}`);
    fs.rmSync(tempDir, { recursive: true, force: true });

    return {
      success: true,
      explanation: explanation || 'Code changes applied successfully',
      changedFiles: Array.from(changedFiles),
    };
  } catch (error) {
    console.error('Error modifying code:', error);

    // Log more details about the error
    if (error.stderr) {
      console.error('Error details:', error.stderr.toString());
    }

    // Make sure we return to the original directory and clean up
    try {
      process.chdir(originalDir);
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    return {
      success: false,
      error: error.message,
      details: error.stderr ? error.stderr.toString() : undefined,
    };
  }
}

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
 * Request code changes from AI and extract search/replace blocks
 * @param {string} context - The context to send to the AI
 * @param {Object} aiClient - AIClient instance
 * @param {string} [additionalContext] - Additional context for retry attempts
 * @returns {Promise<Array<Object>>} - Array of search/replace blocks
 */
async function requestCodeChanges(context, aiClient, additionalContext = '') {
  const contextToUse = additionalContext
    ? `${context}\n\nAdditional context:\n${additionalContext}`
    : context;

  const aiResponse = await aiClient.generateCompletion({
    prompt: PROMPTS.CODE_MODIFICATION,
    context: contextToUse,
    modelStrength: 'strong', // Use strong model for code modifications
    temperature: 0.2,
  });

  return {
    changes: extractSearchReplaceBlocks(aiResponse),
    explanation: extractExplanation(aiResponse),
  };
}

/**
 * Extract search/replace blocks from AI response
 * @param {string} response - The AI response text
 * @returns {Array<Object>} - Array of search/replace blocks
 */
function extractSearchReplaceBlocks(response) {
  console.log('Search replace blocks in response: \n' + response);
  const blocks = [];
  const regex =
    /([^\n]+)\n```[^\n]*\n<<<<<<< SEARCH\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> REPLACE\n```/g;

  let match;
  while ((match = regex.exec(response)) !== null) {
    const [_, filename, search, replace] = match;
    blocks.push({
      filename: filename.trim(),
      search,
      replace,
    });
  }

  return blocks;
}

/**
 * Extract explanation from AI response
 * @param {string} response - The AI response text
 * @returns {string} - Extracted explanation
 */
function extractExplanation(response) {
  // Look for explanation at the beginning of the response, before any search/replace blocks
  const explanationRegex = /^([\s\S]*?)(?:[^\n]+\n```[^\n]*\n<<<<<<< SEARCH)/;
  const match = response.match(explanationRegex);

  if (match && match[1]) {
    return match[1].trim();
  }

  return '';
}

/**
 * Generate a refined explanation using AI
 * @param {string} extractedExplanation - The raw explanation extracted from code changes
 * @param {Object} aiClient - AIClient instance
 * @returns {Promise<string>} - Refined explanation
 */
async function getRefinedExplanation(extractedExplanation, aiClient) {
  if (!extractedExplanation) {
    return 'Code changes requested';
  }

  const prompt = PROMPTS.COMMIT_MESSAGE;

  try {
    const refinedExplanation = await aiClient.generateCompletion({
      prompt,
      context: `Technical explanation: ${extractedExplanation}`,
      modelStrength: 'weak', // Use weak model for simple text generation
      temperature: 0.7,
    });

    // Trim and limit length if needed
    return refinedExplanation.trim().substring(0, 80);
  } catch (error) {
    console.warn('Error generating refined explanation:', error.message);
    return extractedExplanation.substring(0, 80);
  }
}

/**
 * Apply search/replace patches to files with retry logic
 * @param {Array<Object>} blocks - Search/replace blocks to apply
 * @param {Set<string>} changedFiles - Set to track changed files
 * @param {Object} aiClient - AIClient instance
 * @returns {Array<Object>} - Remaining blocks that couldn't be applied
 */
async function applyPatches(blocks, changedFiles, aiClient) {
  let currentBlocks = blocks;
  let maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    const failedBlocks = [];

    // Try to apply each block
    for (const block of currentBlocks) {
      try {
        const { filename, search, replace } = block;
        changedFiles.add(filename);

        // Check if file exists
        if (!fs.existsSync(filename) && search.trim() !== '') {
          throw new Error(
            `File ${filename} does not exist but has non-empty search content`
          );
        }

        // For new files with empty search section
        if (search.trim() === '') {
          // Ensure directory exists
          const dir = path.dirname(filename);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          // Create new file with replace content
          fs.writeFileSync(filename, replace, 'utf8');
          continue;
        }

        // For existing files
        let content = fs.readFileSync(filename, 'utf8');

        // Replace the first occurrence of the search text with the replace text
        if (!content.includes(search)) {
          throw new Error(`Search text not found in ${filename}`);
        }

        content = content.replace(search, replace);

        // Write the modified content back to the file
        fs.writeFileSync(filename, content, 'utf8');
      } catch (blockError) {
        console.warn(
          `Error applying block for ${block.filename}:`,
          blockError.message
        );
        failedBlocks.push({
          block,
          error: blockError.message,
        });
      }
    }

    // If no failures, we're done
    if (failedBlocks.length === 0) {
      break;
    }

    // If we've reached max retries, log and exit
    if (retryCount >= maxRetries - 1) {
      console.warn(
        `Failed to apply ${failedBlocks.length} blocks after ${maxRetries} retries`
      );
      break;
    }

    // Otherwise, retry the failed blocks
    retryCount++;
    console.log(
      `Retry attempt ${retryCount} for ${failedBlocks.length} failed blocks`
    );

    // Create a new request for the AI to fix the failed blocks
    const retryRequestText = `
Some of the search/replace blocks failed to apply. Please provide corrected versions for these blocks:

${failedBlocks
  .map(
    (fb) =>
      `File: ${fb.block.filename}
Error: ${fb.error}
Original search:
\`\`\`
${fb.block.search}
\`\`\`
Original replace:
\`\`\`
${fb.block.replace}
\`\`\`
`
  )
  .join('\n')}

Please provide corrected search/replace blocks for these files.`;

    // Get a new AI response for the failed blocks, passing the additional context
    const retryBlocks = await requestCodeChanges(
      retryRequestText,
      aiClient,
      contextContent
    ).changes;

    if (retryBlocks.length === 0) {
      console.warn('No valid search/replace blocks found in retry response');
      break;
    }

    // Update current blocks to only the retry blocks
    currentBlocks = retryBlocks;
  }

  return currentBlocks;
}

export { modifyCode, requestCodeChanges };

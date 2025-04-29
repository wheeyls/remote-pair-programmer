import fs from 'fs';
import path from 'path';
import { requestCodeChanges } from './aiUtils.js';

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
 * Apply search/replace patches to files with retry logic
 * @param {Array<Object>} blocks - Search/replace blocks to apply
 * @param {Set<string>} changedFiles - Set to track changed files
 * @param {Object} aiClient - AIClient instance
 * @param {ContextContent} contextContent - Original context content for retries
 * @returns {Array<Object>} - Remaining blocks that couldn't be applied
 */
async function applyPatches(blocks, changedFiles, aiClient, contextContent) {
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
      throw new Error(`Failed to apply ${failedBlocks.length} blocks after ${maxRetries} retries`);
    }

    // Otherwise, retry the failed blocks
    retryCount++;
    console.log(
      `Retry attempt ${retryCount} for ${failedBlocks.length} failed blocks`
    );

    // Gather unique filenames from failed blocks
    const uniqueFiles = [
      ...new Set(failedBlocks.map((fb) => fb.block.filename)),
    ];

    // Instead of reading files from disk, filter the contextContent to only include relevant files
    let filteredContextContent;
    if (isContextContentObject) {
      filteredContextContent = contextContent.filterFiles((filename) =>
        uniqueFiles.includes(filename)
      );
    } else {
      // fallback: just use the original contextContent (string)
      filteredContextContent = contextContent;
    }

    // Create a new request for the AI to fix the failed blocks, including user request and file contents
    const retryRequestText = `${filteredContextContent.requestCopy()}

The following search/replace blocks failed to apply. Please provide corrected versions for these blocks:

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

Here are the contents of the relevant files:
${filteredContextContent.fileCopy()}

Please provide corrected search/replace blocks for these files.
`;

    // Get a new AI response for the failed blocks, passing the additional context
    const retryResponse = await requestCodeChanges(
      retryRequestText,
      aiClient,
      filteredContextContent
    );

    const retryBlocks = retryResponse.changes;

    if (retryBlocks.length === 0) {
      console.warn('No valid search/replace blocks found in retry response');
      break;
    }

    // Update current blocks to only the retry blocks
    currentBlocks = retryBlocks;
  }

  return currentBlocks;
}

export { sanitizeForShell, applyPatches };

import PROMPTS from '../prompts.js';

/**
 * Request code changes from AI and extract search/replace blocks
 * @param {ContextContent} context - The context to send to the AI
 * @param {Object} aiClient - AIClient instance
 * @param {string|ContextContent} [additionalContext] - Additional context for retry attempts
 * @returns {Promise<Object>} - Object containing changes and explanation
 */
async function requestCodeChanges(context, aiClient, additionalContext = '') {
  let contextToUse;
  if (additionalContext) {
    contextToUse = `${context.toString()}\n\nAdditional context:\n${additionalContext.toString ? additionalContext.toString() : additionalContext}`;
  } else {
    contextToUse = context.toString();
  }

  const aiResponse = await aiClient.generateCompletion({
    prompt: PROMPTS.CODE_MODIFICATION,
    context: contextToUse,
    modelStrength: 'strong', // Use strong model for code modifications
    temperature: 0.2,
  });

  return extractCodeChanges(aiResponse);
}

/**
 * Extract code changes and explanation from AI response
 * @param {string} response - The AI response text
 * @returns {Object} - Object containing changes and explanation
 */
function extractCodeChanges(response) {
  return {
    changes: extractSearchReplaceBlocks(response),
    explanation: extractExplanation(response),
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
  const headerMatch = response.match(/EXPLANATION:\s*([\s\S]*?)\s*CHANGES:/);
  if (headerMatch && headerMatch[1]) {
    return headerMatch[1].trim();
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

export {
  requestCodeChanges,
  extractCodeChanges,
  extractSearchReplaceBlocks,
  extractExplanation,
  getRefinedExplanation,
};

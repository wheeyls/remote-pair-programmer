import PROMPTS from '../prompts.js';

/**
 * Request code changes from AI and extract search/replace blocks
 * @param {string} context - The context to send to the AI
 * @param {Object} aiClient - AIClient instance
 * @param {string} [additionalContext] - Additional context for retry attempts
 * @returns {Promise<Object>} - Object containing changes and explanation
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

export { requestCodeChanges, extractSearchReplaceBlocks, extractExplanation, getRefinedExplanation };

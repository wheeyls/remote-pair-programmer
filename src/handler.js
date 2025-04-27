const AIClient = require('./aiClient');
const Queue = require('./utils/queue');

// Import command modules
const processPullRequest = require('./commands/processPullRequest');
const processComment = require('./commands/processComment');
const processIssue = require('./commands/processIssue');

/**
 * Initialize the handler with all dependencies
 * @returns {Object} The initialized handler with queue and AI client
 */
function initializeHandler() {
  const aiClient = new AIClient({
    apiKey: process.env.AI_PROVIDER === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.AI_API_KEY,
    model: process.env.AI_MODEL || 'gpt-4',
    strongModel: process.env.STRONG_AI_MODEL,
    weakModel: process.env.WEAK_AI_MODEL,
    provider: process.env.AI_PROVIDER || 'openai'
  });

  // Initialize queue
  const queue = new Queue({
    name: 'github-ai-agent'
  });

  // Get trigger phrase from environment or use default
  const TRIGGER_PHRASE = process.env.TRIGGER_PHRASE || '@github-ai-bot';

  // Register command handlers
  queue.registerHandler('process-pr', async (payload) => {
    return processPullRequest(aiClient, TRIGGER_PHRASE);
  });

  queue.registerHandler('process-comment', async (payload) => {
    return processComment(aiClient, TRIGGER_PHRASE);
  });

  queue.registerHandler('process-issue', async (payload) => {
    return processIssue(aiClient, TRIGGER_PHRASE);
  });

  return {
    aiClient,
    queue,
    TRIGGER_PHRASE
  };
}

/**
 * Run the handler with the specified command
 * @param {string} command - The command to run
 * @returns {Promise<any>} - Result of the command execution
 */
async function runHandler(command) {
  const { queue } = initializeHandler();
  
  if (command === 'process-pr' || command === 'process-comment' || command === 'process-issue') {
    return queue.enqueue(command, {});
  } else {
    console.error('Invalid command. Use: process-pr, process-comment, or process-issue');
    process.exit(1);
  }
}

// Only run the handler if this file is being executed directly
if (require.main === module) {
  const command = process.argv[2];
  runHandler(command).catch(console.error);
}

module.exports = {
  initializeHandler,
  runHandler
};

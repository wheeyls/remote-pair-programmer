const { AIClient } = require('./aiClient');
const { Queue } = require('./utils/queue');

const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

// Import command modules
const processPullRequest = require('./commands/processPullRequest');
const processComment = require('./commands/processComment');
const processIssue = require('./commands/processIssue');
const processReviewComment = require('./commands/processReviewComment');

/**
 * Initialize the handler with all dependencies
 * @param {Object} deps - Optional dependencies to inject
 * @param {AIClient} deps.aiClient - AIClient instance
 * @param {Queue} deps.queue - Queue instance
 * @returns {Object} The initialized handler with queue and AI client
 */
function initializeHandler(deps = {}) {
  // Use injected dependencies or create new instances
  const aiClient = deps.aiClient || new AIClient({
    apiKey: process.env.AI_PROVIDER === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.AI_API_KEY,
    model: process.env.AI_MODEL || 'gpt-4',
    strongModel: process.env.STRONG_AI_MODEL,
    weakModel: process.env.WEAK_AI_MODEL,
    provider: process.env.AI_PROVIDER || 'openai'
  });

  // Initialize queue
  const queue = deps.queue || new Queue({
    name: 'github-ai-agent',
    redisUrl: process.env.REDIS_URL
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
  
  queue.registerHandler('process-review-comment', async (payload) => {
    return processReviewComment(aiClient, TRIGGER_PHRASE);
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
 * @param {Object} deps - Optional dependencies to inject
 * @returns {Promise<any>} - Result of the command execution
 */
async function runHandler(command, deps = {}) {
  const { queue } = initializeHandler(deps);
  
  if (command === 'process-pr' || command === 'process-comment' || command === 'process-issue' || command === 'process-review-comment') {
    return queue.enqueue(command, {});
  } else {
    console.error('Invalid command. Use: process-pr, process-comment, process-issue, or process-review-comment');
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

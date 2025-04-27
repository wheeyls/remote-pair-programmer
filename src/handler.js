const AIClient = require('./aiClient');
const Queue = require('./utils/queue');

// Import command modules
const processPullRequest = require('./commands/processPullRequest');
const processComment = require('./commands/processComment');
const processIssue = require('./commands/processIssue');

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
});

// Get trigger phrase from environment or use default
const TRIGGER_PHRASE = process.env.TRIGGER_PHRASE || '@github-ai-bot';
// Command-line interface for local testing and GitHub Actions
const command = process.argv[2];

if (command === 'process-pr' || command === 'process-comment' || command === 'process-issue') {
  queue.enqueue(command, {}).catch(console.error);
} else {
  console.error('Invalid command. Use: process-pr, process-comment, or process-issue');
  process.exit(1);
}
  processIssue(aiClient, TRIGGER_PHRASE).catch(console.error);
} else {
  console.error('Invalid command. Use: process-pr, process-comment, or process-issue');
  process.exit(1);
}

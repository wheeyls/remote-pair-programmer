const AIClient = require('./aiClient');

// Import command modules
const processPullRequest = require('./commands/processPullRequest');
const processComment = require('./commands/processComment');
const processIssue = require('./commands/processIssue');

// Initialize AI client
const aiClient = new AIClient({
  apiKey: process.env.AI_PROVIDER === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.AI_API_KEY,
  model: process.env.AI_MODEL || 'gpt-4',
  strongModel: process.env.STRONG_AI_MODEL,
  weakModel: process.env.WEAK_AI_MODEL,
  provider: process.env.AI_PROVIDER || 'openai'
});

// Get trigger phrase from environment or use default
const TRIGGER_PHRASE = process.env.TRIGGER_PHRASE || '@github-ai-bot';

// Command-line interface for local testing and GitHub Actions
const command = process.argv[2];

if (command === 'process-pr') {
  processPullRequest(aiClient, TRIGGER_PHRASE).catch(console.error);
} else if (command === 'process-comment') {
  processComment(aiClient, TRIGGER_PHRASE).catch(console.error);
} else if (command === 'process-issue') {
  processIssue(aiClient, TRIGGER_PHRASE).catch(console.error);
} else {
  console.error('Invalid command. Use: process-pr, process-comment, or process-issue');
  process.exit(1);
}


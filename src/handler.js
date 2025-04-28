import { AIClient } from './aiClient.js';
import { createQueue } from './utils/queueFactory.js';

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

// Import command modules
import processPullRequest from './commands/processPullRequest.js';
import processComment from './commands/processComment.js';
import processIssue from './commands/processIssue.js';
import processIssueComment from './commands/processIssueComment.js';
import processReviewComment from './commands/processReviewComment.js';
import processRevert from './commands/processRevert.js';

/**
 * Initialize the handler with all dependencies
 * @param {Object} deps - Optional dependencies to inject
 * @param {AIClient} deps.aiClient - AIClient instance
 * @param {Queue} deps.queue - Queue instance
 * @returns {Object} The initialized handler with queue and AI client
 */
export function initializeHandler(deps = {}) {
  // Use injected dependencies or create new instances
  const aiClient =
    deps.aiClient ||
    new AIClient({
      apiKey:
        process.env.AI_PROVIDER === 'anthropic'
          ? process.env.ANTHROPIC_API_KEY
          : process.env.AI_API_KEY,
      model: process.env.AI_MODEL || 'gpt-4',
      strongModel: process.env.STRONG_AI_MODEL,
      weakModel: process.env.WEAK_AI_MODEL,
      provider: process.env.AI_PROVIDER || 'openai',
    });

  // Initialize web service queue
  const queue =
    deps.queue ||
    createQueue({
      name: 'github-ai-agent',
      baseUrl: process.env.QUEUE_SERVICE_URL,
      authToken: process.env.QUEUE_AUTH_TOKEN,
    });

  // Get trigger phrase from environment or use default
  const TRIGGER_PHRASE = process.env.TRIGGER_PHRASE || '@github-ai-bot';

  // Register command handlers
  queue.registerHandler('process-pr', async (payload) => {
    return processPullRequest(aiClient, TRIGGER_PHRASE, payload);
  });

  queue.registerHandler('process-comment', async (payload) => {
    return processComment(aiClient, TRIGGER_PHRASE, payload);
  });

  queue.registerHandler('process-issue', async (payload) => {
    return processIssue(aiClient, TRIGGER_PHRASE, payload);
  });

  queue.registerHandler('process-issue-comment', async (payload) => {
    return processIssueComment(aiClient, TRIGGER_PHRASE, payload);
  });

  queue.registerHandler('process-review-comment', async (payload) => {
    return processReviewComment(aiClient, TRIGGER_PHRASE, payload);
  });

  queue.registerHandler('process-revert', async (payload) => {
    return processRevert(aiClient, TRIGGER_PHRASE, payload);
  });

  return {
    aiClient,
    queue,
    TRIGGER_PHRASE,
  };
}

/**
 * Run the handler with the specified command
 * @param {string} command - The command to run
 * @param {Object} deps - Optional dependencies to inject
 * @returns {Promise<any>} - Result of the command execution
 */
export async function runHandler(command, deps = {}) {
  const { queue } = initializeHandler(deps);

  const owner = process.env.REPO_OWNER;
  const repo = process.env.REPO_NAME;
  const prNumber = process.env.PR_NUMBER;

  if (command === 'process-issue') {
    const issueNumber = prNumber;

    return queue.enqueue(command, { owner, repo, issueNumber });
  } else if (command === 'process-issue-comment') {
    const commentId = process.env.COMMENT_ID;
    const issueNumber = prNumber;

    return queue.enqueue(command, { owner, repo, issueNumber, commentId });
  } else if (command === 'process-comment') {
    const commentId = process.env.COMMENT_ID;
    // For comments on PRs, we use prNumber as the issue_number
    // GitHub's API treats PR numbers and issue numbers as the same namespace
    return queue.enqueue(command, { owner, repo, prNumber, commentId });
  } else if (command === 'process-review-comment') {
    const commentId = process.env.COMMENT_ID;

    return queue.enqueue(command, { owner, repo, prNumber, commentId });

  } else if (command === 'process-pr') {
    return queue.enqueue(command, { owner, repo, prNumber });
  } else if (command === 'process-revert') {
    const commentId = process.env.COMMENT_ID;

    return queue.enqueue(command, { owner, repo, prNumber, commentId });
  } else {
    console.error(
      'Invalid command. Use: process-pr, process-comment, process-issue, process-issue-comment, process-review-comment, or process-revert'
    );
    process.exit(1);
  }
}

// Only run the handler if this file is being executed directly
if (import.meta.url === import.meta.resolve(process.argv[1])) {
  const command = process.argv[2];
  runHandler(command).catch(console.error);
}

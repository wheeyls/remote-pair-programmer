import { AIClient } from './aiClient.js';
import { createQueue } from './utils/queueFactory.js';

import { config } from './config.js';

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
  const conf = deps.config || config;
  const aiClient =
    deps.aiClient ||
    new AIClient({
      apiKey:
        conf.ai.provider === 'anthropic'
          ? conf.ai.anthropicApiKey
          : conf.ai.openaiApiKey,
      model: conf.ai.model || 'gpt-4',
      strongModel: conf.ai.strongModel,
      weakModel: conf.ai.weakModel,
      provider: conf.ai.provider,
    });

  // Initialize web service queue
  const queue =
    deps.queue ||
    createQueue({
      name: 'github-ai-agent',
      baseUrl: conf.queue.serviceUrl,
      authToken: conf.queue.authToken,
    });

  // Get trigger phrase from environment or use default
  const TRIGGER_PHRASE = conf.bot.triggerPhrase;

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
  const conf = deps.config || config;
  const { queue } = initializeHandler(deps);

  const owner = conf.actions.repoOwner;
  const repo = conf.actions.repoName;
  const prNumber = conf.actions.prNumber;
  const commentId = conf.actions.commentId;

  if (command === 'process-issue') {
    const issueNumber = prNumber;

    return queue.enqueue(command, { owner, repo, issueNumber });
  } else if (command === 'process-issue-comment') {
    const issueNumber = prNumber;

    return queue.enqueue(command, { owner, repo, issueNumber, commentId });
  } else if (command === 'process-comment') {
    // For comments on PRs, we use prNumber as the issue_number
    // GitHub's API treats PR numbers and issue numbers as the same namespace
    return queue.enqueue(command, { owner, repo, prNumber, commentId });
  } else if (command === 'process-review-comment') {
    return queue.enqueue(command, { owner, repo, prNumber, commentId });
  } else if (command === 'process-pr') {
    return queue.enqueue(command, { owner, repo, prNumber });
  } else if (command === 'process-revert') {
    return queue.enqueue(command, { owner, repo, prNumber, commentId });
  } else {
    console.error(
      'Invalid command. Use: process-pr, process-comment, process-issue, process-issue-comment, process-review-comment, or process-revert'
    );
    process.exit(1);
  }
}

// This file now serves as the main entry point for the worker functionality
import { createQueue } from './utils/queueFactory.js';
import { AIClient } from './aiClient.js';
import { config } from './config.js';
import { setOctokit } from './providers/octokitProvider.js';
import { Octokit } from '@octokit/rest';

// Import command modules
import processPullRequest from './commands/processPullRequest.js';
import processComment from './commands/processComment.js';
import processIssue from './commands/processIssue.js';
import processIssueComment from './commands/processIssueComment.js';
import processReviewComment from './commands/processReviewComment.js';
import processRevert from './commands/processRevert.js';

/**
 * Initialize the worker handler with all dependencies
 * @param {Object} deps - Optional dependencies to inject
 * @param {AIClient} deps.aiClient - AIClient instance
 * @param {WorkerQueue} deps.queue - WorkerQueue instance
 * @returns {Object} The initialized handler with queue and AI client
 */
export function initializeWorker(deps = {}) {
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

  const octokit =
    deps.octokit ||
    new Octokit({
      auth: conf.github.token,
    });

  // Get trigger phrase from environment or use default
  const TRIGGER_PHRASE = conf.bot.triggerPhrase;

  // Register command handlers
  queue.registerHandler('process-pr', async (payload) => {
    return await setOctokit(octokit, async () =>
      processPullRequest(aiClient, TRIGGER_PHRASE, payload)
    );
  });

  queue.registerHandler('process-comment', async (payload) => {
    return await setOctokit(octokit, async () =>
      processComment(aiClient, TRIGGER_PHRASE, payload)
    );
  });

  queue.registerHandler('process-issue', async (payload) => {
    return await setOctokit(octokit, async () =>
      processIssue(aiClient, TRIGGER_PHRASE, payload)
    );
  });

  queue.registerHandler('process-issue-comment', async (payload) => {
    return await setOctokit(octokit, async () =>
      processIssueComment(aiClient, TRIGGER_PHRASE, payload)
    );
  });

  queue.registerHandler('process-review-comment', async (payload) => {
    return await setOctokit(octokit, async () =>
      processReviewComment(aiClient, TRIGGER_PHRASE, payload)
    );
  });

  queue.registerHandler('process-revert', async (payload) => {
    return await setOctokit(octokit, async () =>
      processRevert(aiClient, TRIGGER_PHRASE, payload)
    );
  });

  return {
    aiClient,
    queue,
    TRIGGER_PHRASE,
  };
}

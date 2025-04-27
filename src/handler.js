import { AIClient } from './aiClient.js';
import { createQueue } from './utils/queueFactory.js';

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

// Import command modules
import processPullRequest from './commands/processPullRequest.js';
import processComment from './commands/processComment.js';
import processIssue from './commands/processIssue.js';
import processReviewComment from './commands/processReviewComment.js';

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

  queue.registerHandler('process-review-comment', async (payload) => {
    return processReviewComment(aiClient, TRIGGER_PHRASE, payload);
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
    console.log(`Fetching issue #${prNumber} for ${owner}/${repo}`);
    console.log(`Using GitHub token: ${process.env.GITHUB_TOKEN ? 'Token provided' : 'No token'}`);
    
    try {
      // Get issue details with explicit authentication
      const { data: issue } = await octokit.issues.get({
        owner,
        repo,
        issue_number: parseInt(prNumber, 10),
        headers: {
          authorization: `token ${process.env.GITHUB_TOKEN}`
        }
      });
      
      return queue.enqueue(command, { 
        owner, 
        repo, 
        issueNumber: parseInt(prNumber, 10),
        issue,
        triggerPhrase: process.env.TRIGGER_PHRASE || '@github-ai-bot'
      });
      
    } catch (issueError) {
      console.error(`Error fetching issue #${prNumber}:`, issueError);
      console.log(`Status: ${issueError.status}, Message: ${issueError.message}`);
      
      // Create a minimal payload even if we couldn't fetch the issue
      return queue.enqueue(command, {
        owner,
        repo,
        issueNumber: parseInt(prNumber, 10),
        issue: {
          title: 'Unknown Issue',
          body: '',
          number: parseInt(prNumber, 10)
        },
        triggerPhrase: process.env.TRIGGER_PHRASE || '@github-ai-bot'
      });
    }
  } else if (command === 'process-comment') {
    const commentId = process.env.COMMENT_ID;
    const commentBody = process.env.COMMENT_BODY;

    return queue.enqueue(command, { owner, repo, prNumber, commentId, commentBody });
  } else if (command === 'process-review-comment') {
    const commentId = process.env.COMMENT_ID;
    const commentBody = process.env.COMMENT_BODY;

    return queue.enqueue(command, { owner, repo, prNumber, commentId, commentBody });

  } else if (command === 'process-pr') {
    return queue.enqueue(command, { owner, repo, prNumber });
  } else {
    console.error(
      'Invalid command. Use: process-pr, process-comment, process-issue, or process-review-comment'
    );
    process.exit(1);
  }
}

// Only run the handler if this file is being executed directly
if (import.meta.url === import.meta.resolve(process.argv[1])) {
  const command = process.argv[2];
  runHandler(command).catch(console.error);
}

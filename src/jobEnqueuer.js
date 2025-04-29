import { createQueue } from './utils/queueFactory.js';
import { config } from './config.js';

/**
 * Initialize the job enqueuer
 * @param {Object} deps - Optional dependencies to inject
 * @param {Object} deps.config - Configuration object
 * @param {Object} deps.queue - Queue client instance
 * @returns {Object} The initialized enqueuer with queue
 */
export function initializeEnqueuer(deps = {}) {
  const conf = deps.config || config;
  
  // Initialize web service queue client
  const queue =
    deps.queue ||
    createQueue({
      name: 'github-ai-agent',
      baseUrl: conf.queue.serviceUrl,
      authToken: conf.queue.authToken,
    });

  return {
    queue,
  };
}

/**
 * Enqueue a job with the specified command
 * @param {string} command - The command to run
 * @param {Object} deps - Optional dependencies to inject
 * @returns {Promise<any>} - Result of the command execution
 */
export async function enqueueJob(command, deps = {}) {
  const conf = deps.config || config;
  const { queue } = initializeEnqueuer(deps);

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

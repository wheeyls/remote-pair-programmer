import * as core from '@actions/core';
import * as github from '@actions/github';
import { enqueueJob } from './jobEnqueuer.js';
import { config } from './config.js';

async function run() {
  try {
    // Get inputs from GitHub Actions
    const queueServiceUrl = core.getInput('queue-service-url');
    const queueAuthToken = core.getInput('queue-auth-token');

    // Create a copy of the config and override with GitHub Actions inputs
    const actionConfig = { ...config };

    actionConfig.queue = {
      ...actionConfig.queue,
      serviceUrl: queueServiceUrl || actionConfig.queue.serviceUrl,
      authToken: queueAuthToken || actionConfig.queue.authToken,
    };

    // Override GitHub configuration
    actionConfig.github = {
      ...actionConfig.github,
      token: process.env.GITHUB_TOKEN || actionConfig.github.token,
    };

    const eventName = process.env.GITHUB_EVENT_NAME;
    const eventPayload = github.context.payload;

    // Set all action config properties up front
    actionConfig.actions = {
      ...actionConfig.actions,
      repoOwner: github.context.repo.owner,
      repoName: github.context.repo.repo,
      prNumber:
        eventPayload.pull_request?.number?.toString() ||
        eventPayload.issue?.number?.toString() ||
        actionConfig.actions.prNumber,
      commentId:
        eventPayload.comment?.id?.toString() || actionConfig.actions.commentId,
    };

    let command;

    // Determine which command to run based on the event type
    if (eventName === 'pull_request') {
      command = 'process-pr';
    } else if (eventName === 'issues') {
      command = 'process-issue';
    } else if (eventName === 'issue_comment') {
      if (eventPayload.issue?.pull_request) {
        command = 'process-comment';
      } else {
        command = 'process-issue-comment';
      }
    } else if (eventName === 'pull_request_review_comment') {
      command = 'process-review-comment';
    } else {
      command = 'process-comment';
    }

    // Enqueue the job with the determined command and config
    await enqueueJob(command, { config: actionConfig });
    
    core.info(`Successfully enqueued ${command} job`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run().catch((error) => {
  core.setFailed(`Action failed with error: ${error}`);
});

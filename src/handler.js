import * as core from '@actions/core';
import * as github from '@actions/github';
import { runHandler } from './index.js';

async function run() {
  try {
    // Get inputs
    const openaiApiKey = core.getInput('openai-api-key');
    const anthropicApiKey = core.getInput('anthropic-api-key');
    const model = core.getInput('model');
    const strongModel = core.getInput('strong-model');
    const weakModel = core.getInput('weak-model');
    const triggerPhrase = core.getInput('trigger-phrase');
    const aiProvider = core.getInput('ai-provider');
    const queueServiceUrl = core.getInput('queue-service-url');
    const queueAuthToken = core.getInput('queue-auth-token');

    // Set environment variables
    process.env.AI_API_KEY = openaiApiKey;
    process.env.ANTHROPIC_API_KEY = anthropicApiKey;
    process.env.AI_MODEL = model;
    process.env.STRONG_AI_MODEL = strongModel;
    process.env.WEAK_AI_MODEL = weakModel;
    process.env.TRIGGER_PHRASE = triggerPhrase;
    process.env.AI_PROVIDER = aiProvider;
    process.env.QUEUE_SERVICE_URL = queueServiceUrl;
    process.env.QUEUE_AUTH_TOKEN = queueAuthToken;
    
    // Set GitHub-related environment variables
    process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    
    const eventName = process.env.GITHUB_EVENT_NAME;
    const eventPayload = github.context.payload;
    
    let command;
    
    // Determine which command to run based on the event type
    if (eventName === 'pull_request') {
      command = 'process-pr';
      process.env.PR_NUMBER = eventPayload.pull_request.number.toString();
    } else if (eventName === 'issues') {
      command = 'process-issue';
      process.env.PR_NUMBER = eventPayload.issue.number.toString();
    } else if (eventName === 'issue_comment') {
      if (eventPayload.issue.pull_request) {
        command = 'process-comment';
      } else {
        command = 'process-issue-comment';
      }
      process.env.PR_NUMBER = eventPayload.issue.number.toString();
      process.env.COMMENT_ID = eventPayload.comment.id.toString();
      process.env.COMMENT_BODY = eventPayload.comment.body;
    } else if (eventName === 'pull_request_review_comment') {
      command = 'process-review-comment';
      process.env.PR_NUMBER = eventPayload.pull_request.number.toString();
      process.env.COMMENT_ID = eventPayload.comment.id.toString();
      process.env.COMMENT_BODY = eventPayload.comment.body;
    } else {
      command = 'process-comment';
    }
    
    process.env.REPO_OWNER = github.context.repo.owner;
    process.env.REPO_NAME = github.context.repo.repo;
    
    // Run the handler with the determined command
    await runHandler(command);
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

run().catch(error => {
  core.setFailed(`Action failed with error: ${error}`);
});

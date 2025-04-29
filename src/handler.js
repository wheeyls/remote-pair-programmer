import * as core from '@actions/core';
import * as github from '@actions/github';
import { runHandler } from './index.js';
import { config } from './config.js';

async function run() {
  try {
    // Get inputs from GitHub Actions
    const openaiApiKey = core.getInput('openai-api-key');
    const anthropicApiKey = core.getInput('anthropic-api-key');
    const model = core.getInput('model');
    const strongModel = core.getInput('strong-model');
    const weakModel = core.getInput('weak-model');
    const triggerPhrase = core.getInput('trigger-phrase');
    const aiProvider = core.getInput('ai-provider');
    const queueServiceUrl = core.getInput('queue-service-url');
    const queueAuthToken = core.getInput('queue-auth-token');
    
    // Create a copy of the config and override with GitHub Actions inputs
    const actionConfig = { ...config };
    
    // Override AI configuration
    actionConfig.ai = {
      ...actionConfig.ai,
      apiKey: openaiApiKey || actionConfig.ai.apiKey,
      anthropicApiKey: anthropicApiKey || actionConfig.ai.anthropicApiKey,
      model: model || actionConfig.ai.model,
      strongModel: strongModel || actionConfig.ai.strongModel,
      weakModel: weakModel || actionConfig.ai.weakModel,
      provider: aiProvider || actionConfig.ai.provider,
    };
    
    // Override queue configuration
    actionConfig.queue = {
      ...actionConfig.queue,
      serviceUrl: queueServiceUrl || actionConfig.queue.serviceUrl,
      authToken: queueAuthToken || actionConfig.queue.authToken,
    };
    
    // Override bot configuration
    actionConfig.bot = {
      ...actionConfig.bot,
      triggerPhrase: triggerPhrase || actionConfig.bot.triggerPhrase,
    };
    
    // Override GitHub configuration
    actionConfig.github = {
      ...actionConfig.github,
      token: process.env.GITHUB_TOKEN || actionConfig.github.token,
    };
    
    const eventName = process.env.GITHUB_EVENT_NAME;
    const eventPayload = github.context.payload;
    
    let command;
    
    // Determine which command to run based on the event type
    if (eventName === 'pull_request') {
      command = 'process-pr';
      actionConfig.actions = {
        ...actionConfig.actions,
        repoOwner: github.context.repo.owner,
        repoName: github.context.repo.repo,
        prNumber: eventPayload.pull_request.number.toString(),
      };
    } else if (eventName === 'issues') {
      command = 'process-issue';
      actionConfig.actions = {
        ...actionConfig.actions,
        repoOwner: github.context.repo.owner,
        repoName: github.context.repo.repo,
        prNumber: eventPayload.issue.number.toString(),
      };
    } else if (eventName === 'issue_comment') {
      if (eventPayload.issue.pull_request) {
        command = 'process-comment';
      } else {
        command = 'process-issue-comment';
      }
      actionConfig.actions = {
        ...actionConfig.actions,
        repoOwner: github.context.repo.owner,
        repoName: github.context.repo.repo,
        prNumber: eventPayload.issue.number.toString(),
        commentId: eventPayload.comment.id.toString(),
      };
    } else if (eventName === 'pull_request_review_comment') {
      command = 'process-review-comment';
      actionConfig.actions = {
        ...actionConfig.actions,
        repoOwner: github.context.repo.owner,
        repoName: github.context.repo.repo,
        prNumber: eventPayload.pull_request.number.toString(),
        commentId: eventPayload.comment.id.toString(),
      };
    } else {
      command = 'process-comment';
    }
    
    // Run the handler with the determined command and config
    await runHandler(command, { config: actionConfig });
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

run().catch(error => {
  core.setFailed(`Action failed with error: ${error}`);
});

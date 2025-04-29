/**
 * Application configuration
 * Centralizes all environment variables to make testing easier
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

export const config = {
  // AI Configuration
  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.AI_MODEL,
    strongModel: process.env.STRONG_AI_MODEL,
    weakModel: process.env.WEAK_AI_MODEL,
  },

  // Queue Configuration
  queue: {
    serviceUrl:
      process.env.QUEUE_SERVICE_URL ||
      'https://www.remembotron.com/api/v1/command_requests',
    authToken: process.env.QUEUE_AUTH_TOKEN,
  },

  // GitHub Configuration
  github: {
    token: process.env.GITHUB_TOKEN,
  },

  actions: {
    repoOwner: process.env.REPO_OWNER,
    repoName: process.env.REPO_NAME,
    prNumber: process.env.PR_NUMBER,
    commentId: process.env.COMMENT_ID,
  },

  // Bot Configuration
  bot: {
    triggerPhrase: process.env.TRIGGER_PHRASE || '@github-ai-bot',
  },
};

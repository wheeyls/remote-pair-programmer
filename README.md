# GitHub AI Actions

A GitHub Actions-based AI coding agent that not only responds to pull requests and comments but can also commit code changes directly to PRs. This agent acts like a remote pair programmer, helping you develop code even when you're away from your computer.

## Overview

This project provides a GitHub Actions workflow that:

1. Triggers on pull request events (opened, synchronize, reopened)
2. Responds to comments on pull requests
3. Uses AI to generate contextually relevant responses
4. Can commit code changes directly to the PR branch
5. Enables continuous development through conversation

The agent leverages OpenAI's GPT models to understand code context, implement requested changes, and push commits - all through natural language interactions in PR comments.

## Installation

### Prerequisites

- A GitHub repository where you want to install the bot
- OpenAI API key for AI-powered responses

### Setup Steps

1. **Clone this repository or copy its contents**

   ```bash
   git clone https://github.com/yourusername/github_ai_actions.git
   ```

2. **Create a GitHub repository (if you don't have one already)**

   Create a new repository on GitHub where you want to deploy the bot.

3. **Configure GitHub repository secrets**

   In your GitHub repository:
   - Go to Settings > Secrets and variables > Actions
   - Add the following secrets:
     - `AI_API_KEY` - Your OpenAI API key

4. **Push the code to your repository**

   ```bash
   cd github_ai_actions
   git remote set-url origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

5. **Install dependencies (for local development)**

   ```bash
   npm install
   ```

## Required GitHub Repository Settings

### Repository Permissions

The GitHub Actions workflow needs the following permissions:
- `contents: write` - To commit and push changes to the repository
- `pull-requests: write` - To read and comment on pull requests
- `issues: write` - To post comments on issues/PRs

These permissions are already configured in the workflow file.

### Branch Protection (Optional)

If you have branch protection rules, ensure that GitHub Actions has permission to push to protected branches if you want the agent to commit changes directly.

### PR Access Configuration

For the AI agent to work effectively with PRs:

1. **Allow GitHub Actions to create and approve pull requests** in your repository settings
2. **Consider creating a dedicated service account** if you want the commits to come from a specific user rather than the GitHub Actions bot
3. **Set up branch protection rules** that still allow the AI agent to push to branches but maintain other protections

## Usage

### Responding to Pull Requests

The bot will automatically respond to new pull requests with AI-generated comments that provide:
- A summary of the changes
- Potential issues or suggestions
- General feedback based on the code changes

No user action is required to trigger this.

### Interacting with the AI Agent via Comments

Users can interact with the agent by mentioning it in PR comments. The agent will process the comment, respond with AI-generated content, and can commit code changes directly to the PR.

Example comment triggers:

```
@github-ai-bot please review this PR
```

```
@github-ai-bot explain how this code works
```

```
@github-ai-bot implement a function that sorts this array
```

```
@github-ai-bot refactor this code to use async/await
```

The agent will:
1. Analyze the PR context and code changes
2. Generate appropriate code modifications based on your request
3. Commit the changes directly to the PR branch
4. Reply with a summary of what was changed and why

You can also tag PRs with the `ai-assist` label to have the agent automatically review and suggest improvements.

### Local Testing

For local development and testing:

1. Set environment variables:
   ```bash
   export GITHUB_TOKEN=your_github_token
   export AI_API_KEY=your_openai_api_key
   ```

2. Run the handler with a test command:
   ```bash
   npm start process-pr
   # or
   npm start process-comment
   ```

## Development Guidelines

### Project Structure

- `/.github/workflows/main.yml` - GitHub Actions workflow configuration
- `/src/handler.js` - Main handler for processing events and coordinating responses
- `/src/codeChanges.js` - Logic for analyzing, modifying, and committing code changes
- `/src/prompts.js` - System prompts for different AI tasks

### Adding New Features

To extend the agent's capabilities:

1. **Add new event handlers** - Extend the handler.js file with new functions for different event types
2. **Enhance AI prompts** - Modify the system prompts to improve responses and code generation
3. **Add support for additional GitHub events** - Update the workflow file to trigger on more event types
4. **Improve code modification logic** - Enhance the code parsing and modification capabilities

### Testing Changes

Before pushing changes:

1. Run linting:
   ```bash
   npm run lint
   ```

2. Run tests:
   ```bash
   npm test
   ```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.


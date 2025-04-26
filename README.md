# GitHub AI Actions

A GitHub Actions-based bot that automatically responds to pull requests and PR comments using AI-generated content. This bot can help automate code reviews, answer questions, and assist with repository maintenance tasks.

## Overview

This project provides a GitHub Actions workflow that:

1. Triggers on pull request events (opened, synchronize, reopened)
2. Responds to comments on pull requests
3. Uses AI to generate contextually relevant responses
4. Posts the AI-generated content back to the pull request

The bot leverages OpenAI's GPT models to create intelligent responses based on the PR content or comment context.

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

If you have branch protection rules, ensure that GitHub Actions has permission to push to protected branches if you want the bot to commit changes directly.

## Usage

### Responding to Pull Requests

The bot will automatically respond to new pull requests with AI-generated comments that provide:
- A summary of the changes
- Potential issues or suggestions
- General feedback based on the code changes

No user action is required to trigger this.

### Interacting with the Bot via Comments

Users can interact with the bot by leaving comments on pull requests. The bot will process the comment and respond with AI-generated content.

Example comment triggers:

```
@github-ai-bot please review this PR
```

```
@github-ai-bot explain how this code works
```

```
@github-ai-bot suggest improvements for this function
```

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

### Adding New Features

To extend the bot's capabilities:

1. **Add new event handlers** - Extend the handler.js file with new functions for different event types
2. **Enhance AI prompts** - Modify the system prompts to improve responses
3. **Add support for additional GitHub events** - Update the workflow file to trigger on more event types

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


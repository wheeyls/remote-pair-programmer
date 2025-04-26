# GitHub AI Coding Agent

A GitHub Action that allows an AI to make code changes directly to your PR based on comments.

## Features

- Responds to PR comments with AI-generated insights
- Makes code changes and commits them directly to PRs
- Works like a remote pair programmer you can access from anywhere

## Usage

Add this to your repository's `.github/workflows/ai-agent.yml` file:

```yaml
name: AI Coding Agent
on:
  pull_request:
    types: [opened, synchronize, reopened]
  issue_comment:
    types: [created]
  issues:
    types: [opened]

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  process-event:
    runs-on: ubuntu-latest
    if: ${{ (github.event_name == 'pull_request') || (github.event_name == 'issue_comment' && github.event.issue.pull_request) }}
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          ref: ${{ github.event.pull_request.head.ref }}
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Run AI Agent
        uses: yourusername/github-ai-agent@v1
        with:
          openai-api-key: ${{ secrets.AI_API_KEY }}
          ai-provider: 'openai'  # Explicitly set to use OpenAI
          model: 'gpt-4'
```

For Sonnet:

```yaml
name: AI Coding Agent with Sonnet
on:
  pull_request:
    types: [opened, synchronize, reopened]
  issue_comment:
    types: [created]
  issues:
    types: [opened]

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  process-event:
    runs-on: ubuntu-latest
    if: ${{ (github.event_name == 'pull_request') || (github.event_name == 'issue_comment' && github.event.issue.pull_request) }}
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          ref: ${{ github.event.pull_request.head.ref }}
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Run AI Agent
        uses: yourusername/github-ai-agent@v1
        with:
          openai-api-key: ${{ secrets.SONNET_API_KEY }}
          ai-provider: 'sonnet'
          model: 'claude-3-opus-20240229'
          strong-model: 'claude-3-7-sonnet-20250219'
          weak-model: 'claude-3-5-haiku-20241022'
```

## Configuration

### Required Secrets

- `AI_API_KEY` - Your OpenAI or Sonnet API key

To add your API key to GitHub Actions:

1. Go to your GitHub repository
2. Click on "Settings" > "Secrets and variables" > "Actions"
3. Click "New repository secret"
4. Name: `AI_API_KEY`
5. Value: Your OpenAI API key
6. Click "Add secret"

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `openai-api-key` | API key for OpenAI or Sonnet | Yes | N/A |
| `model` | Default AI model to use | No | `gpt-4` |
| `strong-model` | Strong AI model for complex tasks | No | Provider default |
| `weak-model` | Weak AI model for simple tasks | No | Provider default |
| `trigger-phrase` | Phrase to trigger the agent | No | `@github-ai-bot` |
| `ai-provider` | AI provider to use (openai or sonnet) | No | `openai` |
| `sonnet-base-url` | Base URL for Sonnet API (if using Sonnet) | No | `https://api.sonnet.io/v1` |

## Examples

### PR Comments

Comment on a PR with:

```
@github-ai-bot implement a function that sorts this array
```

The agent will:
1. Analyze the PR context
2. Generate appropriate code changes
3. Commit directly to the PR branch
4. Reply with a summary of changes

### Issues

Create a new issue with the trigger phrase in the title or body:

```
Title: @github-ai-bot Add pagination to the user list

Body:
Please implement pagination for the user list component.
We should show 10 users per page and add next/previous buttons.
```

The agent will:
1. Create a new branch
2. Make the requested changes
3. Open a PR with those changes
4. Link back to the original issue

## License

MIT


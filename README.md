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
```

## Configuration

### Required Secrets

- `AI_API_KEY` - Your OpenAI API key

To add your OpenAI API key to GitHub Actions:

1. Go to your GitHub repository
2. Click on "Settings" > "Secrets and variables" > "Actions"
3. Click "New repository secret"
4. Name: `AI_API_KEY`
5. Value: Your OpenAI API key
6. Click "Add secret"

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `openai-api-key` | OpenAI API key | Yes | N/A |
| `model` | AI model to use | No | `gpt-4` |
| `trigger-phrase` | Phrase to trigger the agent | No | `@github-ai-bot` |

## Examples

Comment on a PR with:

```
@github-ai-bot implement a function that sorts this array
```

The agent will:
1. Analyze the PR context
2. Generate appropriate code changes
3. Commit directly to the PR branch
4. Reply with a summary of changes

## License

MIT


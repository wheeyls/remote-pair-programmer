# GitHub AI Coding Agent

A GitHub Action that allows an AI to make code changes directly to your PR based on comments.

## Features

- Responds to PR comments with AI-generated insights
- Responds to line-specific review comments in PRs
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
  pull_request_review_comment:
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


For Anthropic:

```yaml
name: AI Coding Agent with Anthropic
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
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          ai-provider: 'anthropic'
          model: 'claude-3-5-sonnet-latest'
          strong-model: 'claude-3-5-sonnet-latest'
          weak-model: 'claude-3-haiku-latest'
```

## Configuration

### Required Secrets

- `AI_API_KEY` - Your OpenAI API key (when using OpenAI provider)
- `ANTHROPIC_API_KEY` - Your Anthropic API key (when using Anthropic provider)
- `REDIS_URL` - Your Redis connection URL (when using Redis queue)
- `QUEUE_SERVICE_URL` - Your queue web service URL (when using web service queue)
- `QUEUE_TYPE` - Type of queue to use (`redis` or `webservice`)

To add your secrets to GitHub Actions:

1. Go to your GitHub repository
2. Click on "Settings" > "Secrets and variables" > "Actions"
3. Click "New repository secret"
4. Add each required secret with its value
5. Click "Add secret"

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `openai-api-key` | API key for OpenAI | No* | N/A |
| `anthropic-api-key` | API key for Anthropic | No* | N/A |
| `model` | Default AI model to use | No | `gpt-4` |
| `strong-model` | Strong AI model for complex tasks | No | Provider default |
| `weak-model` | Weak AI model for simple tasks | No | Provider default |
| `trigger-phrase` | Phrase to trigger the agent | No | `@github-ai-bot` |
| `ai-provider` | AI provider to use (openai or anthropic) | No | `openai` |
| `anthropic-base-url` | Base URL for Anthropic API (if needed) | No | `https://api.anthropic.com` |
| `queue-type` | Type of queue to use (redis or webservice) | No | `redis` |
| `redis-url` | Redis URL for queue operations | No** | N/A |
| `queue-service-url` | Web service URL for queue operations | No** | N/A |

*Either `openai-api-key` or `anthropic-api-key` is required depending on which provider you use.  
**Either `redis-url` or `queue-service-url` is required depending on which queue type you use.

## Examples

### PR Comments

Comment on a PR with:

```
@github-ai-bot implement a function that sorts this array

.add-files
- src/utils/*.js
- src/components/

.ignore
- node_modules/
- dist/
```

The agent will:
1. Analyze the PR context and the additional files specified
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

.add-files
- src/components/UserList.js
- src/styles/pagination.css
```

The agent will:
1. Create a new branch
2. Make the requested changes
3. Push the changes to the branch
4. Comment on the issue with a link to create a PR

Note: Due to GitHub Actions permissions limitations, the bot cannot create PRs directly. Instead, it will provide a link for you to create the PR manually.

## License

MIT


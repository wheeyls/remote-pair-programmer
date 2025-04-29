# GitHub AI Coding Agent

A GitHub Action that allows an AI to make code changes directly to your PR based on comments.

## Architecture

This project uses a distributed architecture with two main components:

1. **GitHub Action** - Enqueues jobs to a queue service when GitHub events occur
2. **Worker** - Processes jobs from the queue, interacts with AI, and makes code changes

This separation allows for more reliable processing and better scalability.

## Features

- Responds to PR comments with AI-generated insights
- Responds to line-specific review comments in PRs
- Makes code changes and commits them directly to PRs
- Works like a remote pair programmer you can access from anywhere

## Usage

### 1. Set up the GitHub Action

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
          queue-service-url: ${{ secrets.QUEUE_SERVICE_URL }}
          queue-auth-token: ${{ secrets.QUEUE_AUTH_TOKEN }}
          trigger-phrase: '@github-ai-bot'
```

### 2. Set up the Worker

The worker needs to be deployed separately, typically on a server or cloud service. It processes jobs from the queue and interacts with the AI service.

Example worker setup:

1. Clone the repository
2. Create a `.env` file with your configuration:
   ```
   # Queue Configuration
   QUEUE_SERVICE_URL=https://your-queue-service.com/api
   QUEUE_AUTH_TOKEN=your-auth-token
   
   # AI Configuration (OpenAI)
   AI_PROVIDER=openai
   OPENAI_API_KEY=your-openai-api-key
   AI_MODEL=gpt-4
   
   # Or for Anthropic
   # AI_PROVIDER=anthropic
   # ANTHROPIC_API_KEY=your-anthropic-api-key
   # AI_MODEL=claude-3-5-sonnet-latest
   
   # Bot Configuration
   BOT_TRIGGER_PHRASE=@github-ai-bot
   ```
3. Start the worker:
   ```bash
   npm install
   node worker.js
   ```

## Configuration

### Required Secrets for GitHub Action

- `QUEUE_SERVICE_URL` - Your queue web service URL
- `QUEUE_AUTH_TOKEN` - API token for queue service authentication (optional)

### Required Environment Variables for Worker

- `QUEUE_SERVICE_URL` - Your queue web service URL
- `QUEUE_AUTH_TOKEN` - API token for queue service authentication (optional)
- `AI_PROVIDER` - AI provider to use (openai or anthropic)
- `OPENAI_API_KEY` - Your OpenAI API key (when using OpenAI provider)
- `ANTHROPIC_API_KEY` - Your Anthropic API key (when using Anthropic provider)
- `AI_MODEL` - Default AI model to use

### GitHub Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `trigger-phrase` | Phrase to trigger the agent | No | `@github-ai-bot` |
| `queue-service-url` | Web service URL for queue operations | Yes | N/A |
| `queue-auth-token` | API token for queue service authentication | No | N/A |

## File Context Directives

The AI agent can access additional files beyond those changed in the PR by using file context directives in your comments. This helps the AI understand more of your codebase to make better suggestions.

### New Format (Recommended)

```
/add path/to/file.js src/**/*.js
/ignore node_modules/ dist/
```

### Legacy Format

```
.add-files
- path/to/file.js
- src/**/*.js

.ignore
- node_modules/
- dist/
```

### Directive Types

- `/add` or `.add-files`: Specify additional files or glob patterns to include
- `/ignore` or `.ignore`: Specify files or directories to exclude

### Usage Tips

- Use glob patterns to include multiple files (e.g., `src/**/*.js` for all JavaScript files in the src directory)
- Add trailing slashes to directory names to ignore entire directories (e.g., `node_modules/`)
- The AI will have access to:
  1. Files changed in the PR
  2. Files specified in add directives
  3. Any additional context files provided by the action configuration

## Examples

### PR Comments

Comment on a PR with:

```
@github-ai-bot implement a function that sorts this array

/add src/utils/*.js src/components/
/ignore node_modules/ dist/
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

/add src/components/UserList.js src/styles/pagination.css
```

The agent will:
1. Create a new branch
2. Make the requested changes
3. Push the changes to the branch
4. Comment on the issue with a link to create a PR

Note: Due to GitHub Actions permissions limitations, the bot cannot create PRs directly. Instead, it will provide a link for you to create the PR manually.

## Development

### Project Structure

```
├── src/
│   ├── commands/           # Command handlers for different GitHub events
│   ├── utils/
│   │   ├── queueClient.js  # Client for enqueuing jobs
│   │   ├── workerQueue.js  # Worker for processing jobs
│   │   └── queueFactory.js # Factory to create the appropriate queue
│   ├── aiClient.js         # Client for AI service interactions
│   ├── config.js           # Configuration management
│   ├── handler.js          # GitHub Action entry point
│   ├── index.js            # Worker initialization
│   └── jobEnqueuer.js      # Job enqueuing logic
├── worker.js               # Worker process entry point
└── action.yml              # GitHub Action definition
```

### Architecture Flow

1. **GitHub Event** → GitHub Action runs `handler.js`
2. `handler.js` → Uses `jobEnqueuer.js` to enqueue a job
3. `jobEnqueuer.js` → Creates a `QueueClient` to send job to queue service
4. **Queue Service** → Stores job for processing
5. `worker.js` → Runs continuously, polling for jobs
6. `worker.js` → Uses `index.js` to initialize worker
7. `index.js` → Creates a `WorkerQueue` and registers command handlers
8. `WorkerQueue` → Fetches and processes jobs using registered handlers
9. Command handlers → Use `AIClient` to generate responses and make changes

## License

MIT


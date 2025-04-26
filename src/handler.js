const { Octokit } = require('@octokit/rest');
const { OpenAI } = require('openai');

// Initialize API clients
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY
});

async function processPullRequest() {
  const prNumber = process.env.PR_NUMBER;
  const owner = process.env.REPO_OWNER;
  const repo = process.env.REPO_NAME;

  try {
    // Get PR details
    const { data: pullRequest } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    // Get PR diff
    const { data: diff } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff'
      }
    });

    // Generate AI response based on PR content
    const aiResponse = await generateAIResponse({
      title: pullRequest.title,
      description: pullRequest.body,
      diff: diff
    });

    // Post comment on PR
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: aiResponse
    });

  } catch (error) {
    console.error('Error processing pull request:', error);
    throw error;
  }
}

async function processComment() {
  const commentId = process.env.COMMENT_ID;
  const prNumber = process.env.PR_NUMBER;
  const owner = process.env.REPO_OWNER;
  const repo = process.env.REPO_NAME;
  const commentBody = process.env.COMMENT_BODY;

  try {
    // Generate AI response to comment
    const aiResponse = await generateAIResponse({
      comment: commentBody,
      context: `PR #${prNumber}`
    });

    // Post AI response as a reply
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `> ${commentBody}\n\n${aiResponse}`
    });

  } catch (error) {
    console.error('Error processing comment:', error);
    throw error;
  }
}

async function generateAIResponse(context) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant reviewing code and responding to questions about pull requests. Provide constructive feedback and clear explanations."
        },
        {
          role: "user",
          content: JSON.stringify(context)
        }
      ],
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}

// Command-line interface for local testing and GitHub Actions
const command = process.argv[2];

if (command === 'process-pr') {
  processPullRequest().catch(console.error);
} else if (command === 'process-comment') {
  processComment().catch(console.error);
} else {
  console.error('Invalid command. Use: process-pr or process-comment');
  process.exit(1);
}


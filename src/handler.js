const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');
const AIClient = require('./aiClient');
const { modifyCode } = require('./codeChanges');
const PROMPTS = require('./prompts');

// Initialize API clients
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const aiClient = new AIClient({
  apiKey: process.env.AI_API_KEY,
  model: process.env.AI_MODEL || 'gpt-4',
  strongModel: process.env.STRONG_AI_MODEL,
  weakModel: process.env.WEAK_AI_MODEL,
  provider: process.env.AI_PROVIDER || 'openai',
  sonnetBaseUrl: process.env.SONNET_BASE_URL
});

// Get trigger phrase from environment or use default
const TRIGGER_PHRASE = process.env.TRIGGER_PHRASE || '@github-ai-bot';

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
    // Check if this is a code modification request
    const isCodeModRequest = commentBody.includes(TRIGGER_PHRASE) && 
      (commentBody.includes('change') || 
       commentBody.includes('modify') || 
       commentBody.includes('update') || 
       commentBody.includes('fix') || 
       commentBody.includes('implement') || 
       commentBody.includes('refactor'));

    if (isCodeModRequest) {
      // This is a code modification request
      const result = await modifyCode({
        owner,
        repo,
        prNumber,
        requestText: commentBody,
        aiClient: aiClient // Pass the AIClient instance
      });

      let responseBody;
      if (result.success) {
        responseBody = `✅ I've made the requested changes and pushed them to this PR.\n\n**Changes made:**\n${result.explanation}\n\n**Modified files:**\n${result.changedFiles.map(f => `- \`${f}\``).join('\n')}`;
      } else {
        responseBody = `❌ I encountered an error while trying to modify the code:\n\`\`\`\n${result.error}\n\`\`\`\n\nPlease provide more details or try a different request.`;
      }

      // Post response as a reply
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: `> ${commentBody}\n\n${responseBody}`
      });
    } else {
      // This is a regular comment, just respond with AI
      // Use strong model for complex questions, weak model for simple responses
      const isComplexQuestion = commentBody.length > 100 || 
        commentBody.includes('explain') || 
        commentBody.includes('how') || 
        commentBody.includes('why');
      
      const modelStrength = isComplexQuestion ? 'strong' : 'weak';
      
      const aiResponse = await generateAIResponse(
        {
          comment: commentBody,
          context: `PR #${prNumber}`
        }, 
        'COMMENT_RESPONSE',
        modelStrength
      );

      // Post AI response as a reply
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: `> ${commentBody}\n\n${aiResponse}`
      });
    }
  } catch (error) {
    console.error('Error processing comment:', error);
    
    // Post error message as a reply
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `> ${commentBody}\n\n❌ I encountered an error while processing your request:\n\`\`\`\n${error.message}\n\`\`\`\n\nPlease try again or rephrase your request.`
    });
  }
}

async function generateAIResponse(context, promptType = 'PR_REVIEW', modelStrength = 'strong') {
  try {
    return await aiClient.generateCompletion({
      prompt: PROMPTS[promptType],
      context: context,
      modelStrength: modelStrength,
      temperature: 0.7
    });
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}

async function processIssue() {
  const issueNumber = process.env.PR_NUMBER; // This will be the issue number in this context
  const owner = process.env.REPO_OWNER;
  const repo = process.env.REPO_NAME;

  try {
    // Get issue details
    const { data: issue } = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber
    });

    const issueBody = issue.body || '';
    const issueTitle = issue.title || '';

    // Check if this issue contains the trigger phrase
    if (!issueTitle.includes(TRIGGER_PHRASE) && !issueBody.includes(TRIGGER_PHRASE)) {
      console.log(issueBody);
      console.log(issueTitle);
      console.log('Issue does not contain trigger phrase. Skipping.');
      return;
    }

    // Comment that we're processing the request
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: `I'm processing your request to make code changes. I'll convert this issue into a PR shortly.`
    });

    // Create a new branch for the changes
    const baseBranch = 'main'; // Assuming main is the default branch
    const newBranch = `ai-changes-issue-${issueNumber}`;
    
    // Get the SHA of the latest commit on the base branch
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`
    });
    const sha = refData.object.sha;
    
    // Create a new branch
    try {
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${newBranch}`,
        sha
      });
    } catch (error) {
      // If branch already exists, we'll just use it
      console.log(`Branch ${newBranch} already exists or couldn't be created: ${error.message}`);
    }
    
    // Checkout the new branch locally
    try {
      const { execSync } = require('child_process');
      execSync(`git fetch origin ${newBranch} || git fetch origin ${baseBranch}`);
      execSync(`git checkout ${newBranch} || git checkout -b ${newBranch} origin/${baseBranch}`);
    } catch (error) {
      console.error(`Error checking out branch: ${error.message}`);
      throw error;
    }

    // Make the requested changes
    const result = await modifyCode({
      owner,
      repo,
      prNumber: issueNumber, // Using issue number as context
      requestText: `${issueTitle}\n\n${issueBody}`,
      aiClient: aiClient
    });

    if (!result.success) {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: `❌ I encountered an error while trying to make the requested changes:\n\`\`\`\n${result.error}\n\`\`\`\n\nPlease provide more details or try a different request.`
      });
      return;
    }

    // Convert the issue to a PR using the GitHub API
    // This requires using the GraphQL API as the REST API doesn't support this directly
    const query = `
      mutation {
        convertToDraft(input: {
          repositoryId: "${issue.repository_id}",
          issueId: "${issue.node_id}"
        }) {
          pullRequest {
            id
            number
          }
        }
      }
    `;

    // Execute the GraphQL query
    const graphqlResponse = await octokit.graphql(query);
    const prNumber = graphqlResponse.convertToDraft.pullRequest.number;
    
    // Update the PR with the correct head and base branches
    await octokit.pulls.update({
      owner,
      repo,
      pull_number: prNumber,
      title: `AI: ${result.explanation}`,
      body: `**Changes made:**\n${result.explanation}\n\n**Modified files:**\n${result.changedFiles.map(f => `- \`${f}\``).join('\n')}`,
      head: newBranch,
      base: baseBranch
    });

    // Comment on the PR with details about the changes
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `✅ I've converted this issue into a PR and made the requested changes.\n\n**Changes made:**\n${result.explanation}\n\n**Modified files:**\n${result.changedFiles.map(f => `- \`${f}\``).join('\n')}`
    });

  } catch (error) {
    console.error('Error processing issue:', error);
    
    // Post error message as a comment on the issue
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: `❌ I encountered an error while processing your request:\n\`\`\`\n${error.message}\n\`\`\`\n\nPlease try again or rephrase your request.`
    });
  }
}

// Command-line interface for local testing and GitHub Actions
const command = process.argv[2];

if (command === 'process-pr') {
  processPullRequest().catch(console.error);
} else if (command === 'process-comment') {
  processComment().catch(console.error);
} else if (command === 'process-issue') {
  processIssue().catch(console.error);
} else {
  console.error('Invalid command. Use: process-pr, process-comment, or process-issue');
  process.exit(1);
}


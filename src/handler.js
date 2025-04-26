const { Octokit } = require('@octokit/rest');
const AIClient = require('./aiClient');
const { modifyCode } = require('./codeChanges');
const PROMPTS = require('./prompts');

// Initialize API clients
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const aiClient = new AIClient({
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
    // Check if this is a code modification request
    const isCodeModRequest = commentBody.includes('@github-ai-bot') && 
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


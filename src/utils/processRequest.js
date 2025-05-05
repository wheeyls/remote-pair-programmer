import { modifyCode as defaultCodeModifier } from '../codeChanges/index.js';
import PROMPTS from '../prompts.js';
import handleError from './errorHandler.js';
import addIssueComment from './commentUtils.js';
import { ContextContent } from '../codeChanges/ContextContent.js';
import { PRHelper } from '../github/prHelper.js';
import { getOctokit } from '../providers/octokitProvider.js';

/**
 * Process a request from a PR or comment
 * @param {Object} params - Parameters for processing the request
 * @param {Object} params.aiClient - AIClient instance
 * @param {string} params.triggerPhrase - Phrase that triggers the bot
 * @param {string} params.requestText - The text of the request
 * @param {Object} params.context - Context information about the request
 * @param {string} params.context.owner - Repository owner
 * @param {string} params.context.repo - Repository name
 * @param {number} params.context.prNumber - PR number
 * @returns {Promise<Object>} - Result of processing the request
 */
async function processRequest(params) {
  const {
    aiClient,
    triggerPhrase,
    requestText,
    context,
    codeModifier,
    prHelper,
  } = params;
  const { owner, repo, prNumber } = context;

  const octokit = getOctokit();
  const modifyCode = codeModifier || defaultCodeModifier;
  const pr = prHelper || new PRHelper({ octokit, owner, repo, prNumber });

  // Check if this is a bot message or should be ignored
  if (requestText.includes('bot:ignore')) {
    console.log('Ignoring comment due to ignore directive');
    return { success: true, ignored: true };
  }

  // Check if the trigger phrase is present
  if (!requestText.includes(triggerPhrase)) {
    console.log('Trigger phrase not found, ignoring request');
    return { success: true, ignored: true };
  }

  await pr.addReaction();
  const prContext = await pr.toContext();

  // Make sure fileNames is a proper array
  if (!prContext.fileNames || !Array.isArray(prContext.fileNames)) {
    console.log('PR context fileNames is not an array, setting to empty array');
    prContext.fileNames = [];
  }

  const contextContent = new ContextContent(requestText, prContext);

  try {
    // Check if this is a code modification request
    const isArchitectureRequest = requestText.includes('architect');

    if (!isArchitectureRequest) {
      console.log('Using two-stage approach for code modifications: planning and applying');
      
      // Get PR context
      const result = await modifyCode({
        prHelper: pr,
        aiClient,
        contextContent,
        octokit,
      });

      let responseBody;
      if (result.success) {
        responseBody = `✅ I've made the requested changes and pushed them to this PR.\n\n**Changes made:**\n${
          result.explanation
        }\n\n**Modified files:**\n${result.changedFiles
          .map((f) => `- \`${f}\``)
          .join('\n')}\n\n*Changes were applied using a two-stage process: planning and applying.*`;
      } else {
        responseBody = `❌ I encountered an error while trying to modify the code:\n\`\`\`\n${result.error}\n\`\`\`\n\nPlease provide more details or try a different request.`;
      }

      // Post response as a reply
      await pr.addComment({
        body: responseBody,
      });

      return { success: true, isCodeMod: true, response: responseBody };
    } else {
      const aiResponse = await generateAIResponse(
        aiClient,
        {
          comment: requestText,
          context: contextContent.toString(),
        },
        'COMMENT_RESPONSE',
        'strong'
      );

      // Post AI response as a reply
      await addIssueComment({
        octokit,
        owner,
        repo,
        issue_number: prNumber,
        body: aiResponse,
      });

      return { success: true, isCodeMod: false, response: aiResponse };
    }
  } catch (error) {
    // Use the shared error handler
    await handleError({
      error,
      octokit,
      owner,
      repo,
      issueNumber: prNumber,
    });

    throw error;
    return { success: false, error: error.message };
  }
}

/**
 * Generate an AI response
 */
async function generateAIResponse(
  aiClient,
  context,
  promptType = 'COMMENT_RESPONSE',
  modelStrength = 'strong'
) {
  try {
    return await aiClient.generateCompletion({
      prompt: PROMPTS[promptType],
      context: context,
      modelStrength: modelStrength,
      temperature: 0.7,
    });
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}

export default processRequest;

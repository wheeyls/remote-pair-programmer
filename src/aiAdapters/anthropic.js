const Anthropic = require('@anthropic-ai/sdk');
const BaseAdapter = require('./baseAdapter');

/**
 * Adapter for Anthropic API
 */
class AnthropicAdapter extends BaseAdapter {
  /**
   * Creates a new AnthropicAdapter
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - Anthropic API key
   */
  constructor(options) {
    super(options);

    this.client = new Anthropic({
      apiKey: this.apiKey,
    });
  }

  /**
   * Generate a completion using the Anthropic API
   * @param {Object} options - Completion options
   * @param {string} options.model - Model to use
   * @param {Array} options.messages - Messages to send to the model
   * @param {number} options.temperature - Temperature for generation
   * @param {Object} options.response_format - Response format specification
   * @returns {Promise<Object>} - The generated completion
   */
  async createChatCompletion(options) {
    try {
      // Extract system message from the messages array
      let systemMessage = '';
      let userMessages = [];

      for (const message of options.messages) {
        if (message.role === 'system') {
          systemMessage = message.content;
        } else {
          userMessages.push(message);
        }
      }

      // Convert OpenAI-style options to Anthropic format
      const anthropicOptions = {
        model: options.model,
        messages: userMessages,
        temperature: options.temperature,
        system: systemMessage,
        max_tokens: options.max_tokens || 8000,
      };

      // Handle response format if specified
      if (
        options.response_format &&
        options.response_format.type === 'json_object'
      ) {
        anthropicOptions.system =
          (anthropicOptions.system ? anthropicOptions.system + '\n\n' : '') +
          'Please provide your response as a valid JSON object.';
      }

      const completion = await this.client.messages.create(anthropicOptions);

      // Convert Anthropic response to OpenAI-like format for compatibility
      // Make sure we're handling the response format correctly
      let content = '';
      if (completion.content && Array.isArray(completion.content) && completion.content.length > 0) {
        content = completion.content[0].text || '';
      }

      return {
        choices: [
          {
            message: {
              content: content,
              role: 'assistant',
            },
          },
        ],
      };
    } catch (error) {
      console.error('Error generating Anthropic completion:', error);
      throw error;
    }
  }

  /**
   * Get the default models for Anthropic
   * @returns {Object} - Object with 'strong' and 'weak' model identifiers
   */
  getDefaultModels() {
    return {
      strong: 'claude-3-7-sonnet-latest',
      weak: 'claude-3-haiku-latest',
    };
  }
}

module.exports = AnthropicAdapter;

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
      // Convert OpenAI-style options to Anthropic format
      const anthropicOptions = {
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: 4096, // Default max tokens
      };

      // Handle response format if specified
      if (options.response_format && options.response_format.type === 'json_object') {
        anthropicOptions.system = "Please provide your response as a valid JSON object.";
      }

      const completion = await this.client.messages.create(anthropicOptions);
      
      // Convert Anthropic response to OpenAI-like format for compatibility
      return {
        choices: [
          {
            message: {
              content: completion.content[0].text,
              role: 'assistant'
            }
          }
        ]
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
      strong: 'claude-3-5-sonnet-latest',
      weak: 'claude-3-haiku-latest',
    };
  }
}

module.exports = AnthropicAdapter;

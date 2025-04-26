const OpenAIAdapter = require('./aiAdapters/openai');
const SonnetAdapter = require('./aiAdapters/sonnet');
const AnthropicAdapter = require('./aiAdapters/anthropic');

/**
 * A wrapper around AI APIs that simplifies model selection and provider switching
 */
class AIClient {
  /**
   * Creates a new AIClient
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - API key for the selected provider
   * @param {string} [options.provider="openai"] - AI provider to use ("openai" or "sonnet")
   * @param {string} [options.model] - Default model to use
   * @param {string} [options.sonnetBaseUrl] - Base URL for Sonnet API (if using Sonnet)
   */
  constructor(options) {
    this.provider = options.provider || 'openai';
    
    // Initialize the appropriate adapter
    if (this.provider === 'openai') {
      this.adapter = new OpenAIAdapter({
        apiKey: options.apiKey
      });
    } else if (this.provider === 'sonnet') {
      this.adapter = new SonnetAdapter({
        apiKey: options.apiKey,
        baseUrl: options.sonnetBaseUrl
      });
    } else if (this.provider === 'anthropic') {
      this.adapter = new AnthropicAdapter({
        apiKey: options.apiKey
      });
    } else {
      throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
    
    // Get default models from the adapter
    const defaultModels = this.adapter.getDefaultModels();
    
    // Model configuration with override options
    this.models = {
      strong: options.strongModel || options.model || defaultModels.strong,
      weak: options.weakModel || defaultModels.weak
    };
  }

  /**
   * Generate a completion using the selected AI provider
   * @param {Object} options - Completion options
   * @param {string} options.prompt - System prompt to use
   * @param {Object} options.context - Context data to send to the model
   * @param {string} [options.modelStrength="strong"] - Model strength ("strong" or "weak")
   * @param {number} [options.temperature=0.7] - Temperature for generation
   * @param {Object} [options.responseFormat] - Response format specification
   * @returns {Promise<string>} - The generated completion text
   */
  async generateCompletion({ prompt, context, modelStrength = "strong", temperature = 0.7, responseFormat = null }) {
    const model = this.models[modelStrength] || this.models.strong;
    
    const requestOptions = {
      model,
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: typeof context === 'string' ? context : JSON.stringify(context)
        }
      ],
      temperature
    };
    
    // Add response format if specified
    if (responseFormat) {
      requestOptions.response_format = responseFormat;
    }
    
    try {
      const completion = await this.adapter.createChatCompletion(requestOptions);
      return completion.choices[0].message.content;
    } catch (error) {
      console.error(`Error generating AI completion with ${this.provider}:`, error);
      throw error;
    }
  }
}

module.exports = AIClient;

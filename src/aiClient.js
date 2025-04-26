const { OpenAI } = require('openai');
const SonnetClient = require('./sonnetClient');

/**
 * A wrapper around AI APIs that simplifies model selection
 */
class AIClient {
  /**
   * Creates a new AIClient
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - API key for the selected provider
   * @param {string} [options.provider="openai"] - AI provider to use ("openai" or "sonnet")
   * @param {string} [options.sonnetBaseUrl] - Base URL for Sonnet API (if using Sonnet)
   */
  constructor(options) {
    this.provider = options.provider || 'openai';
    
    if (this.provider === 'openai') {
      this.client = new OpenAI({
        apiKey: options.apiKey
      });
    } else if (this.provider === 'sonnet') {
      this.client = new SonnetClient({
        apiKey: options.apiKey,
        baseUrl: options.sonnetBaseUrl
      });
    } else {
      throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
    
    // Model configuration
    this.models = {
      strong: options.model || (this.provider === 'openai' ? "gpt-4" : "claude-3-opus-20240229"),
      weak: this.provider === 'openai' ? "gpt-3.5-turbo" : "claude-3-haiku-20240307"
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
      let completion;
      
      if (this.provider === 'openai') {
        completion = await this.client.chat.completions.create(requestOptions);
        return completion.choices[0].message.content;
      } else if (this.provider === 'sonnet') {
        completion = await this.client.createChatCompletion(requestOptions);
        return completion.choices[0].message.content;
      }
    } catch (error) {
      console.error(`Error generating AI completion with ${this.provider}:`, error);
      throw error;
    }
  }
}

module.exports = AIClient;

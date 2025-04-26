const { OpenAI } = require('openai');

/**
 * A wrapper around OpenAI API that simplifies model selection
 */
class AIClient {
  /**
   * Creates a new AIClient
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - OpenAI API key
   */
  constructor(options) {
    this.openai = new OpenAI({
      apiKey: options.apiKey
    });
    
    // Model configuration
    this.models = {
      strong: options.model || "gpt-4",
      weak: "gpt-3.5-turbo"
    };
  }

  /**
   * Generate a completion using the OpenAI API
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
      const completion = await this.openai.chat.completions.create(requestOptions);
      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error generating AI completion:', error);
      throw error;
    }
  }
}

module.exports = AIClient;

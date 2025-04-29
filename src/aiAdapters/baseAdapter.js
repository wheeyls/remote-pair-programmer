/**
 * Base class for AI provider adapters
 */
export class BaseAdapter {
  /**
   * Creates a new AI adapter
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - API key for the provider
   */
  constructor(options) {
    if (this.constructor === BaseAdapter) {
      throw new Error(
        'BaseAdapter is an abstract class and cannot be instantiated directly'
      );
    }

    this.apiKey = options.apiKey;
  }

  /**
   * Generate a completion using the AI provider
   * @param {Object} options - Completion options
   * @param {string} options.model - Model to use
   * @param {Array} options.messages - Messages to send to the model
   * @param {number} options.temperature - Temperature for generation
   * @param {Object} options.response_format - Response format specification
   * @returns {Promise<Object>} - The generated completion
   */
  async createChatCompletion(options) {
    throw new Error(
      'Method createChatCompletion must be implemented by subclasses'
    );
  }

  /**
   * Get the default models for this provider
   * @returns {Object} - Object with 'strong' and 'weak' model identifiers
   */
  getDefaultModels() {
    throw new Error(
      'Method getDefaultModels must be implemented by subclasses'
    );
  }
}

const fetch = require('node-fetch');
const BaseAdapter = require('./baseAdapter');

/**
 * Adapter for Sonnet API
 */
class SonnetAdapter extends BaseAdapter {
  /**
   * Creates a new SonnetAdapter
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - Sonnet API key
   * @param {string} options.baseUrl - Sonnet API base URL (optional)
   */
  constructor(options) {
    super(options);
    this.baseUrl = options.baseUrl || 'https://api.sonnet.io/v1';
  }

  /**
   * Generate a completion using the Sonnet API
   * @param {Object} options - Completion options
   * @param {string} options.model - Model to use
   * @param {Array} options.messages - Messages to send to the model
   * @param {number} options.temperature - Temperature for generation
   * @param {Object} options.response_format - Response format specification
   * @returns {Promise<Object>} - The generated completion
   */
  async createChatCompletion(options) {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Sonnet API error: ${error.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating Sonnet completion:', error);
      throw error;
    }
  }

  /**
   * Get the default models for Sonnet
   * @returns {Object} - Object with 'strong' and 'weak' model identifiers
   */
  getDefaultModels() {
    return {
      strong: "claude-3-opus-20240229",
      weak: "claude-3-haiku-20240307"
    };
  }
}

module.exports = SonnetAdapter;

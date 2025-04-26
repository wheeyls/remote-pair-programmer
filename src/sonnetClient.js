/**
 * A wrapper around Sonnet API
 */
class SonnetClient {
  /**
   * Creates a new SonnetClient
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - Sonnet API key
   * @param {string} options.baseUrl - Sonnet API base URL (optional)
   */
  constructor(options) {
    this.apiKey = options.apiKey;
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
  }
}

module.exports = SonnetClient;

import { OpenAI } from 'openai';
import { BaseAdapter } from './baseAdapter.js';

/**
 * Adapter for OpenAI API
 */
export class OpenAIAdapter extends BaseAdapter {
  /**
   * Creates a new OpenAIAdapter
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - OpenAI API key
   */
  constructor(options) {
    super(options);

    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  /**
   * Generate a completion using the OpenAI API
   * @param {Object} options - Completion options
   * @param {string} options.model - Model to use
   * @param {Array} options.messages - Messages to send to the model
   * @param {number} options.temperature - Temperature for generation
   * @param {Object} options.response_format - Response format specification
   * @returns {Promise<Object>} - The generated completion
   */
  async createChatCompletion(options) {
    try {
      const completion = await this.client.chat.completions.create(options);
      return completion;
    } catch (error) {
      console.error('Error generating OpenAI completion:', error);
      throw error;
    }
  }

  /**
   * Get the default models for OpenAI
   * @returns {Object} - Object with 'strong' and 'weak' model identifiers
   */
  getDefaultModels() {
    return {
      strong: 'gpt-4.1',
      weak: 'gpt-4.1-mini',
    };
  }
}

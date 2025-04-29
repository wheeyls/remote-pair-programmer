import { jest } from '@jest/globals';
import { AIClient } from '../src/aiClient.js';
import { OpenAIAdapter } from '../src/aiAdapters/openai.js';
import { AnthropicAdapter } from '../src/aiAdapters/anthropic.js';

describe('AIClient', () => {
  test('initializes with the correct provider', () => {
    const openaiClient = new AIClient({
      apiKey: 'test-key',
      provider: 'openai',
    });

    const anthropicClient = new AIClient({
      apiKey: 'test-key',
      provider: 'anthropic',
    });

    expect(openaiClient.provider).toBe('openai');
    expect(anthropicClient.provider).toBe('anthropic');
  });

  test('throws error for unsupported provider', () => {
    expect(() => {
      new AIClient({
        apiKey: 'test-key',
        provider: 'unsupported',
      });
    }).toThrow('Unsupported AI provider');
  });

  test('has strong and weak models', () => {
    const client = new AIClient({
      apiKey: 'test-key',
      provider: 'openai',
    });

    expect(client.models).toHaveProperty('strong');
    expect(client.models).toHaveProperty('weak');
  });

  test('can override default models', () => {
    const client = new AIClient({
      apiKey: 'test-key',
      provider: 'openai',
      strongModel: 'custom-strong',
      weakModel: 'custom-weak',
    });

    expect(client.models.strong).toBe('custom-strong');
    expect(client.models.weak).toBe('custom-weak');
  });
});

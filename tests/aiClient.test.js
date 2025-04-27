const AIClient = require('../src/aiClient');
const OpenAIAdapter = require('../src/aiAdapters/openai');
const AnthropicAdapter = require('../src/aiAdapters/anthropic');

// Create mock adapter instances that we can reference in tests
const mockOpenAIAdapter = {
  createChatCompletion: jest.fn().mockResolvedValue({
    choices: [{ message: { content: 'OpenAI response' } }]
  }),
  getDefaultModels: jest.fn().mockReturnValue({
    strong: 'gpt-4.1',
    weak: 'gpt-4.1-mini'
  })
};

const mockAnthropicAdapter = {
  createChatCompletion: jest.fn().mockResolvedValue({
    choices: [{ message: { content: 'Anthropic response' } }]
  }),
  getDefaultModels: jest.fn().mockReturnValue({
    strong: 'claude-3-7-sonnet-latest',
    weak: 'claude-3-haiku-latest'
  })
};

// Mock the adapters
jest.mock('../src/aiAdapters/openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAIAdapter);
});

jest.mock('../src/aiAdapters/anthropic', () => {
  return jest.fn().mockImplementation(() => mockAnthropicAdapter);
});

describe('AIClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('initializes OpenAI adapter when provider is openai', () => {
    const client = new AIClient({
      apiKey: 'test-api-key',
      provider: 'openai',
      model: 'custom-model'
    });
    
    expect(OpenAIAdapter).toHaveBeenCalledWith({
      apiKey: 'test-api-key'
    });
    expect(client.provider).toBe('openai');
    expect(client.models.strong).toBe('custom-model');
  });
  
  test('initializes Anthropic adapter when provider is anthropic', () => {
    const client = new AIClient({
      apiKey: 'test-api-key',
      provider: 'anthropic',
      model: 'custom-model'
    });
    
    expect(AnthropicAdapter).toHaveBeenCalledWith({
      apiKey: 'test-api-key'
    });
    expect(client.provider).toBe('anthropic');
    expect(client.models.strong).toBe('custom-model');
  });
  
  test('throws error for unsupported provider', () => {
    expect(() => {
      new AIClient({
        apiKey: 'test-api-key',
        provider: 'unsupported'
      });
    }).toThrow('Unsupported AI provider: unsupported');
  });
  
  test('uses default models when not specified', () => {
    const client = new AIClient({
      apiKey: 'test-api-key',
      provider: 'openai'
    });
    
    expect(client.models.strong).toBe('gpt-4.1');
    expect(client.models.weak).toBe('gpt-4.1-mini');
  });
  
  test('uses custom models when specified', () => {
    const client = new AIClient({
      apiKey: 'test-api-key',
      provider: 'openai',
      strongModel: 'strong-model',
      weakModel: 'weak-model'
    });
    
    expect(client.models.strong).toBe('strong-model');
    expect(client.models.weak).toBe('weak-model');
  });
  
  test('generates completion with OpenAI adapter', async () => {
    const client = new AIClient({
      apiKey: 'test-api-key',
      provider: 'openai'
    });
    
    const result = await client.generateCompletion({
      prompt: 'Test prompt',
      context: 'Test context',
      modelStrength: 'strong',
      temperature: 0.5
    });
    
    expect(mockOpenAIAdapter.createChatCompletion).toHaveBeenCalledWith({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: 'Test prompt' },
        { role: 'user', content: 'Test context' }
      ],
      temperature: 0.5
    });
    expect(result).toBe('OpenAI response');
  });
  
  test('generates completion with Anthropic adapter', async () => {
    const client = new AIClient({
      apiKey: 'test-api-key',
      provider: 'anthropic'
    });
    
    const result = await client.generateCompletion({
      prompt: 'Test prompt',
      context: 'Test context',
      modelStrength: 'weak',
      temperature: 0.7,
      responseFormat: { type: 'json_object' }
    });
    
    expect(mockAnthropicAdapter.createChatCompletion).toHaveBeenCalledWith({
      model: 'claude-3-haiku-latest',
      messages: [
        { role: 'system', content: 'Test prompt' },
        { role: 'user', content: 'Test context' }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });
    expect(result).toBe('Anthropic response');
  });
  
  test('handles object context by converting to JSON', async () => {
    const client = new AIClient({
      apiKey: 'test-api-key',
      provider: 'openai'
    });
    
    await client.generateCompletion({
      prompt: 'Test prompt',
      context: { key: 'value' },
      modelStrength: 'strong'
    });
    
    expect(mockOpenAIAdapter.createChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'system', content: 'Test prompt' },
          { role: 'user', content: '{"key":"value"}' }
        ]
      })
    );
  });
});

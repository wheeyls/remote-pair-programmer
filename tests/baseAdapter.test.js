import { jest } from '@jest/globals';
import { BaseAdapter } from '../src/aiAdapters/baseAdapter.js';

describe('BaseAdapter', () => {
  test('cannot be instantiated directly', () => {
    expect(() => {
      new BaseAdapter({ apiKey: 'test-key' });
    }).toThrow(
      'BaseAdapter is an abstract class and cannot be instantiated directly'
    );
  });

  test('requires subclasses to implement createChatCompletion', async () => {
    // Create a minimal subclass
    class TestAdapter extends BaseAdapter {
      constructor(options) {
        super(options);
      }
      // Intentionally not implementing createChatCompletion
      getDefaultModels() {
        return { strong: 'test-model', weak: 'test-model-mini' };
      }
    }

    const adapter = new TestAdapter({ apiKey: 'test-key' });

    await expect(adapter.createChatCompletion({})).rejects.toThrow(
      'Method createChatCompletion must be implemented by subclasses'
    );
  });

  test('requires subclasses to implement getDefaultModels', () => {
    // Create a minimal subclass
    class TestAdapter extends BaseAdapter {
      constructor(options) {
        super(options);
      }
      async createChatCompletion() {
        return {};
      }
      // Intentionally not implementing getDefaultModels
    }

    const adapter = new TestAdapter({ apiKey: 'test-key' });

    expect(() => {
      adapter.getDefaultModels();
    }).toThrow('Method getDefaultModels must be implemented by subclasses');
  });

  test('stores the API key', () => {
    // Create a minimal subclass
    class TestAdapter extends BaseAdapter {
      constructor(options) {
        super(options);
      }
      async createChatCompletion() {
        return {};
      }
      getDefaultModels() {
        return { strong: 'test-model', weak: 'test-model-mini' };
      }
    }

    const adapter = new TestAdapter({ apiKey: 'test-key' });
    expect(adapter.apiKey).toBe('test-key');
  });
});

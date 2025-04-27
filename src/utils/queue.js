/**
 * A simple queue adapter that allows for offloading work to external services.
 * Initially, this implementation will process commands immediately in the current process,
 * but can be extended to use Redis, Firebase, or other services in the future.
 */
class Queue {
  /**
   * Create a new Queue instance
   * @param {Object} options - Queue configuration options
   */
  constructor(options = {}) {
    this.options = options;
    this.name = options.name || 'default';
    this.handlers = new Map();
  }

  /**
   * Register a handler for a specific command type
   * @param {string} commandType - The type of command to handle
   * @param {Function} handler - The handler function
   */
  registerHandler(commandType, handler) {
    if (typeof handler !== 'function') {
      throw new Error(`Handler for ${commandType} must be a function`);
    }
    this.handlers.set(commandType, handler);
  }

  /**
   * Add a command to the queue
   * @param {string} commandType - The type of command
   * @param {Object} payload - The command payload
   * @returns {Promise<any>} - Result of the command execution
   */
  async enqueue(commandType, payload) {
    console.log(`Enqueueing command: ${commandType}`, payload);
    
    // For now, we'll just process the command immediately
    return this.processCommand(commandType, payload);
  }

  /**
   * Process a command using its registered handler
   * @param {string} commandType - The type of command to process
   * @param {Object} payload - The command payload
   * @returns {Promise<any>} - Result of the command execution
   * @private
   */
  async processCommand(commandType, payload) {
    const handler = this.handlers.get(commandType);
    
    if (!handler) {
      throw new Error(`No handler registered for command type: ${commandType}`);
    }
    
    try {
      return await handler(payload);
    } catch (error) {
      console.error(`Error processing command ${commandType}:`, error);
      throw error;
    }
  }
}

module.exports = Queue;
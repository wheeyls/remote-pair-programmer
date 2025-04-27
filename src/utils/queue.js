const { createClient } = require('redis');

/**
 * A queue implementation using Redis
 */
class Queue {
  /**
   * Create a new Queue instance
   * @param {Object} options - Queue configuration options
   * @param {string} options.redisUrl - Redis connection URL
   */
  constructor(options = {}) {
    this.options = options;
    this.name = options.name || 'default';
    this.handlers = new Map();
    
    // Redis connection string from environment or options
    this.redisUrl = options.redisUrl || process.env.REDIS_URL;
    
    if (!this.redisUrl) {
      throw new Error('Redis URL is required for queue operations');
    }
    
    // We'll connect lazily when needed
    this.client = null;
  }

  /**
   * Connect to Redis if not already connected
   * @private
   */
  async _connect() {
    if (!this.client) {
      this.client = createClient({ url: this.redisUrl });
      this.client.on('error', (err) => console.error('Redis Client Error', err));
      await this.client.connect();
    }
    return this.client;
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
   * @returns {Promise<string>} - Job ID
   */
  async enqueue(commandType, payload) {
    console.log(`Enqueueing command: ${commandType}`, payload);
    
    const client = await this._connect();
    
    const job = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      commandType,
      payload,
      addedAt: new Date().toISOString()
    };
    
    // Add job to the queue
    await client.lPush(`${this.name}:queue`, JSON.stringify(job));
    
    return job.id;
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

  /**
   * Process the next job in the queue
   * @returns {Promise<Object|null>} - Result of processing the job, or null if no job
   */
  async processNextJob() {
    const client = await this._connect();
    
    // Get the next job from the queue (RPOP = right pop, oldest item first)
    const jobData = await client.rPop(`${this.name}:queue`);
    
    if (!jobData) {
      return null; // No jobs in the queue
    }
    
    try {
      const job = JSON.parse(jobData);
      console.log(`Processing job ${job.id} of type ${job.commandType}`);
      
      const result = await this.processCommand(job.commandType, job.payload);
      
      // Record successful completion
      await client.hSet(`${this.name}:completed`, job.id, JSON.stringify({
        job,
        result,
        completedAt: new Date().toISOString()
      }));
      
      return { job, result };
    } catch (error) {
      console.error('Error processing job:', error);
      
      // Record failure
      if (jobData) {
        const job = JSON.parse(jobData);
        await client.hSet(`${this.name}:failed`, job.id, JSON.stringify({
          job,
          error: error.message,
          failedAt: new Date().toISOString()
        }));
      }
      
      throw error;
    }
  }
}

module.exports = Queue;

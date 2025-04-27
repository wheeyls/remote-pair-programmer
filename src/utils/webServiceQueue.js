import fetch from 'node-fetch';

/**
 * A queue implementation using a generic web service
 */
export class WebServiceQueue {
  /**
   * Create a new WebServiceQueue instance
   * @param {Object} options - Queue configuration options
   * @param {string} options.baseUrl - Base URL for the web service
   * @param {string} [options.authToken] - API authentication token
   */
  constructor(options = {}) {
    this.options = options;
    this.name = options.name || 'default';
    this.handlers = new Map();

    // Base URL for the web service
    this.baseUrl = options.baseUrl;

    // Authentication token
    this.authToken = options.authToken;

    if (!this.baseUrl) {
      throw new Error('Base URL is required for web service queue operations');
    }
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

    const job = {
      name: commandType,
      body: payload,
    };

    // Add job to the queue via web service
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add API token header if token is provided
    if (this.authToken) {
      headers['X-API-Token'] = this.authToken;
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(job)
    });

    if (!response.ok) {
      throw new Error(`Failed to enqueue job: ${response.status} ${response.statusText}`);
    }

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
    // Get the next job from the queue
    const headers = {
      'Accept': 'application/json',
    };

    // Add API token header if token is provided
    if (this.authToken) {
      headers['X-API-Token'] = this.authToken;
    }

    const response = await fetch(`${this.baseUrl}/next`, {
      method: 'GET',
      headers
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to get next job: ${response.status} ${response.statusText}`);
    }

    // If no jobs (404) or empty response
    if (response.status === 404 || response.headers.get('content-length') === '0') {
      return null;
    }

    const jobData = await response.json();

    if (!jobData || !jobData.id) {
      return null; // No jobs in the queue
    }

    try {
      const job = jobData;
      console.log(`Processing job ${job.id} of type ${job.name}`);
      console.log(`Job payload:`, JSON.stringify(job.body, null, 2));

      const result = await this.processCommand(job.name, job.body);

      // Record successful completion
      const headers = {
        'Content-Type': 'application/json',
      };

      // Add API token header if token is provided
      if (this.authToken) {
        headers['X-API-Token'] = this.authToken;
      }

      await fetch(`${this.baseUrl}/completed/${job.id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          job,
          result,
          completedAt: new Date().toISOString()
        })
      });

      return { job, result };
    } catch (error) {
      console.error('Error processing job:', error);
      console.error('Error details:', error.stack);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }

      // Record failure
      if (jobData) {
        const headers = {
          'Content-Type': 'application/json',
        };

        // Add API token header if token is provided
        if (this.authToken) {
          headers['X-API-Token'] = this.authToken;
        }

        await fetch(`${this.baseUrl}/failed/${jobData.id}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            job: jobData,
            error: error.message,
            failedAt: new Date().toISOString()
          })
        });
      }

      throw error;
    }
  }
}

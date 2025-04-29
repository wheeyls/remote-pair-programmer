import dotenv from 'dotenv';
import { initializeWorker } from './src/index.js';

// Set environment to worker mode
process.env.NODE_ENV = 'worker';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

async function startWorker() {
  console.log('Starting queue worker...');

  // Initialize the worker which sets up the queue and registers handlers
  const { queue } = initializeWorker();

  console.log(`Worker connected to web service queue: ${queue.name}`);
  console.log('Waiting for jobs...');

  // Process jobs in a loop
  async function processJobs() {
    try {
      const result = await queue.processNextJob();

      if (result) {
        console.log(`Processed job ${result.job.id} successfully`);
      } else {
        // No jobs in queue, wait a bit before checking again
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Continue processing
      setImmediate(processJobs);
    } catch (error) {
      console.error('Error in job processing loop:', error);
      console.error('Error details:', error.stack);

      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }

      // Continue processing despite errors
      setTimeout(processJobs, 5000);
    }
  }

  // Start processing
  processJobs();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down worker...');
    process.exit(0);
  });
}

startWorker().catch((err) => {
  console.error('Worker startup error:', err);
  process.exit(1);
});

import dotenv from 'dotenv';
import { initializeHandler } from './src/handler.js';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

async function startWorker() {
  console.log('Starting queue worker...');
  
  // Initialize the handler which sets up the queue and registers handlers
  const { queue } = initializeHandler();
  
  console.log(`Worker connected to Redis queue: ${queue.name}`);
  console.log('Waiting for jobs...');
  
  // Process jobs in a loop
  async function processJobs() {
    try {
      const result = await queue.processNextJob();
      
      if (result) {
        console.log(`Processed job ${result.job.id} successfully`);
      } else {
        // No jobs in queue, wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Continue processing
      setImmediate(processJobs);
    } catch (error) {
      console.error('Error in job processing loop:', error);
      // Continue processing despite errors
      setTimeout(processJobs, 5000);
    }
  }
  
  // Start processing
  processJobs();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down worker...');
    if (queue.client) {
      await queue.client.quit();
    }
    process.exit(0);
  });
}

startWorker().catch(err => {
  console.error('Worker startup error:', err);
  process.exit(1);
});

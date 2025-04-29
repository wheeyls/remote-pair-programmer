import { enqueueJob } from './jobEnqueuer.js';

const command = process.argv[2];
enqueueJob(command).catch(console.error);

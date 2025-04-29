import { runHandler } from './index.js';
 
const command = process.argv[2];
runHandler(command).catch(console.error);

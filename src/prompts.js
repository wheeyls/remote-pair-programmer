import fs from 'fs';
import path from 'path';
/**
 * System prompts for different AI tasks
 */

// Resolve paths relative to the project root
const promptsDir = path.resolve(process.cwd(), 'src/prompts');

const PROMPTS = {
  PR_REVIEW: fs.readFileSync(path.join(promptsDir, 'prReview.txt'), 'utf-8'),
  COMMIT_MESSAGE: fs.readFileSync(
    path.join(promptsDir, 'commitMessage.txt'),
    'utf-8'
  ),
  COMMENT_RESPONSE: fs.readFileSync(
    path.join(promptsDir, 'commentResponse.txt'),
    'utf-8'
  ),
  CODE_PLANNING: fs.readFileSync(
    path.join(promptsDir, 'codePlanning.txt'),
    'utf-8'
  ),
  CODE_APPLY: fs.readFileSync(path.join(promptsDir, 'codeApply.txt'), 'utf-8'),
  RETRY_CODE_APPLY: fs.readFileSync(
    path.join(promptsDir, 'retryCodeApply.txt'),
    'utf-8'
  ),
  CODE_MODIFICATION: fs.readFileSync(
    path.join(promptsDir, 'codeModification.txt'),
    'utf-8'
  ),
};

export default PROMPTS;
export { PROMPTS };

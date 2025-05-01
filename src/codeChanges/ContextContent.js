import fs from 'fs';
import { processFileContext } from '../utils/fileContext.js';

class ContextContent {
  constructor(requestText, prContext) {
    this.requestText = requestText;
    this.prContext = prContext;
  }

  filePaths() {
    if (this.available) {
      return this.available;
    }

    const all = processFileContext({
      text: this.requestText,
      additionalFiles: this.prContext.fileNames || [],
    });

    return (this.available = Object.keys(all || {}));
  }

  toString() {
    console.log('** Providing context for request **');
    console.log('Available files:', this.filePaths().join(' '));
    console.log('Title:', this.prContext.title?.substring(0, 50));
    console.log('Body:', this.prContext.body?.substring(0, 50));
    console.log(
      'Comment snippets:',
      this.prContext.comments.map((c) => c.body?.substring(0, 50)).join('\n')
    );
    console.log('***********************************');

    return `${this.requestCopy()}\n\n${this.fileCopy()}`;
  }

  requestCopy() {
    let copy = '';
    if (
      this.prContext &&
      this.prContext.body &&
      this.prContext.body !== this.requestText
    ) {
      copy += `PR Details:\n${this.prContext.body}\n\n`;
    }
    if (this.prContext && this.prContext.comments) {
      copy += `Comment Thread:\n${this.prContext.comments}\n\n`;
    }
    copy += `Request: ${this.requestText}`;
    return copy;
  }

  getFileContents() {
    const fileContents = {};
    for (const filePath of this.filePaths()) {
      try {
        fileContents[filePath] = fs.readFileSync(filePath, 'utf8');
      } catch (error) {
        console.warn(`Could not read file ${filePath}:`, error);
        fileContents[filePath] = `[Error reading file: ${error.message}]`;
      }
    }
    return fileContents;
  }

  fileCopy() {
    const fileContents = this.getFileContents();
    return `Available files and contents:
${Object.entries(fileContents)
  .map(([filename, content]) => `--- ${filename} ---\n${content}\n`)
  .join('\n')}`;
  }
}

export { ContextContent };

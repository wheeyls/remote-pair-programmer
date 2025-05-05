import fs from 'fs';
import { processFileContext } from '../utils/fileContext.js';

class ContextContent {
  constructor(requestText, prContext, plan) {
    this.requestText = requestText;
    this.prContext = prContext;
    this.plan = plan;
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

  append(text) {
    this.requestText += `${text}\n\nPrevious request:\n${this.requestText}`;
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
    console.log(
      'Diff snippet:',
      this.prContext.diff
        ? this.prContext.diff.substring(0, 50)
        : 'No diff available'
    );
    console.log(
      'Review comment snippet:',
      this.reviewComment().substring(0, 50)
    );
    console.log('***********************************');

    return `${this.requestCopy()}${this.planCopy()}\n\n${this.fileCopy()}${this.diff()}${this.reviewComment()}`;
  }

  planCopy() {
    if (!this.plan) {
      return '';
    }

    return `\n\nPlan:\n${this.plan}`;
  }

  reviewComment() {
    if (!this.prContext.reviewComment) {
      return '';
    }

    const reviewComment = this.prContext.reviewComment;

    const output = JSON.stringify(reviewComment);

    return `\n\nReview Comment:\n${output}`;
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

  diff() {
    return this.prContext.diff ? `\n\nDiff:\n${this.prContext.diff}` : '';
  }
}

export { ContextContent };

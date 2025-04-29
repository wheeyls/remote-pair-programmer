import fs from 'fs';

class ContextContent {
  constructor(requestText, filePaths) {
    this.requestText = requestText;
    this.filePaths = Array.isArray(filePaths) ? filePaths : Object.keys(filePaths || {});
  }

  toString() {
    return `${this.requestCopy()}\n\n${this.fileCopy()}`;
  }

  requestCopy() {
    return `Request: ${this.requestText}`;
  }

  getFileContents() {
    const fileContents = {};
    for (const filePath of this.filePaths) {
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

  filterFiles(callback) {
    const fileContents = this.getFileContents();
    const filteredPaths = this.filePaths.filter(filePath => 
      callback(filePath, fileContents[filePath])
    );
    return new ContextContent(this.requestText, filteredPaths);
  }
}

export default ContextContent;

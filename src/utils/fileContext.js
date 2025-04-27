import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

/**
 * Get all files in the repository
 * @returns {Array<string>} - Array of file paths
 */
function getAllRepoFiles() {
  try {
    // Use git to list all tracked files
    const result = execSync('git ls-files').toString().trim();
    return result.split('\n');
  } catch (error) {
    console.error('Error getting repo files:', error);
    return [];
  }
}

function baseFiles() {
  // Get all files in the repository
  /*const allFiles = getAllRepoFiles();

  // Filter for specific file types
  return allFiles.filter(file =>
    file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') ||
    file.endsWith('.tsx') || file.endsWith('.json') || file.endsWith('.md') ||
    file.endsWith('.css') || file.endsWith('.html')
    );
  */

  return [];
}

/**
 * Extract file context directives from text
 * @param {string} text - The text to parse for directives
 * @returns {Object} - Object with addFiles and ignoreFiles arrays
 */
function extractFileDirectives(text) {
  const result = {
    addFiles: [],
    ignoreFiles: [],
  };

  // Extract .add-files directive
  const addFilesMatch = text.match(/\.add-files\s+((?:-\s+[^\n]+\s*)+)/);
  if (addFilesMatch && addFilesMatch[1]) {
    const addFilesList = addFilesMatch[1].match(/-\s+([^\n]+)/g);
    if (addFilesList) {
      result.addFiles = addFilesList.map((item) =>
        item.replace(/^-\s+/, '').trim()
      );
    }
  }

  // Extract .ignore directive
  const ignoreFilesMatch = text.match(/\.ignore\s+((?:-\s+[^\n]+\s*)+)/);
  if (ignoreFilesMatch && ignoreFilesMatch[1]) {
    const ignoreFilesList = ignoreFilesMatch[1].match(/-\s+([^\n]+)/g);
    if (ignoreFilesList) {
      result.ignoreFiles = ignoreFilesList.map((item) =>
        item.replace(/^-\s+/, '').trim()
      );
    }
  }

  return result;
}

/**
 * Resolve file globs to actual file paths
 * @param {Array<string>} patterns - Array of glob patterns
 * @returns {Array<string>} - Array of resolved file paths
 */
function resolveGlobs(patterns) {
  let files = [];

  for (const pattern of patterns) {
    try {
      // Handle directory patterns by appending /**/* to include all files
      const adjustedPattern = pattern.endsWith('/')
        ? `${pattern}**/*`
        : pattern;
      const matches = glob.sync(adjustedPattern, { nodir: true });
      files = [...files, ...matches];
    } catch (error) {
      console.warn(`Error resolving glob pattern ${pattern}:`, error);
    }
  }

  return [...new Set(files)]; // Remove duplicates
}

/**
 * Filter files based on ignore patterns
 * @param {Array<string>} files - Array of file paths
 * @param {Array<string>} ignorePatterns - Array of glob patterns to ignore
 * @returns {Array<string>} - Filtered array of file paths
 */
function applyIgnorePatterns(files, ignorePatterns) {
  if (!ignorePatterns || ignorePatterns.length === 0) {
    return files;
  }

  const ignoreFiles = resolveGlobs(ignorePatterns);

  // Also handle directory-based ignores
  return files.filter((file) => {
    // Check if file matches any ignore pattern
    if (ignoreFiles.includes(file)) {
      return false;
    }

    // Check if file is in an ignored directory
    for (const pattern of ignorePatterns) {
      if (pattern.endsWith('/') && file.startsWith(pattern)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get file contents for a list of files
 * @param {Array<string>} files - Array of file paths
 * @returns {Object} - Object mapping file paths to their contents
 */
function getFileContents(files) {
  const contents = {};

  for (const file of files) {
    try {
      contents[file] = fs.readFileSync(file, 'utf8');
    } catch (error) {
      console.warn(`Could not read file ${file}:`, error);
    }
  }

  return contents;
}

/**
 * Process file context directives and return file contents
 * @param {string} text - Text containing directives
 * @param {Array<string>} baseFiles - Base set of files to include (e.g., PR files)
 * @returns {Object} - Object mapping file paths to their contents
 */
function processFileContext({ text, baseFiles = [], additionalFiles = [] }) {
  // Extract directives
  const directives = extractFileDirectives(text);

  // Resolve add-files globs
  const directiveFiles = resolveGlobs(directives.addFiles);

  // Combine base files with additional files
  let allFiles = [...baseFiles(), ...additionalFiles, ...directiveFiles];

  // Apply ignore patterns
  allFiles = applyIgnorePatterns(allFiles, directives.ignoreFiles);

  // Get file contents
  return getFileContents(allFiles);
}

export {
  extractFileDirectives,
  resolveGlobs,
  applyIgnorePatterns,
  getFileContents,
  processFileContext,
};

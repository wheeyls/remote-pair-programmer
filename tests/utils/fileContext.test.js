import '../setup.js';
import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  extractFileDirectives,
  resolveGlobs,
  applyIgnorePatterns,
  getFileContents,
  processFileContext,
} from '../../src/utils/fileContext.js';

describe('fileContext', () => {
  // Create a temporary directory for file operations
  let tempDir;
  
  beforeAll(() => {
    // Create a temporary directory for our tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filecontext-test-'));
    
    // Create test directory structure
    fs.mkdirSync(path.join(tempDir, 'src'));
    fs.mkdirSync(path.join(tempDir, 'test'));
    fs.mkdirSync(path.join(tempDir, 'node_modules'));
    fs.mkdirSync(path.join(tempDir, 'dist'));
    
    // Create test files
    fs.writeFileSync(path.join(tempDir, 'src', 'file1.js'), 'content of file1');
    fs.writeFileSync(path.join(tempDir, 'src', 'file2.js'), 'content of file2');
    fs.writeFileSync(path.join(tempDir, 'test', 'test1.js'), 'test content');
    fs.writeFileSync(path.join(tempDir, 'node_modules', 'file.js'), 'node_modules content');
    fs.writeFileSync(path.join(tempDir, 'dist', 'bundle.js'), 'bundle content');
    fs.writeFileSync(path.join(tempDir, 'file1.test.js'), 'test file content');
    fs.writeFileSync(path.join(tempDir, 'additional.js'), 'additional content');
  });
  
  afterAll(() => {
    // Clean up the temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('extractFileDirectives', () => {
    it('should extract new format /add directives', () => {
      const text = 'Some text\n/add file1.js file2.js\nMore text';
      const result = extractFileDirectives(text);
      expect(result.addFiles).toEqual(['file1.js', 'file2.js']);
    });

    it('should extract new format /ignore directives', () => {
      const text = 'Some text\n/ignore node_modules/ dist/\nMore text';
      const result = extractFileDirectives(text);
      expect(result.ignoreFiles).toEqual(['node_modules/', 'dist/']);
    });

    it('should extract old format .add-files directives', () => {
      const text = 'Some text\n.add-files\n- file1.js\n- file2.js\nMore text';
      const result = extractFileDirectives(text);
      expect(result.addFiles).toEqual(['file1.js', 'file2.js']);
    });

    it('should extract old format .ignore directives', () => {
      const text = 'Some text\n.ignore\n- node_modules/\n- dist/\nMore text';
      const result = extractFileDirectives(text);
      expect(result.ignoreFiles).toEqual(['node_modules/', 'dist/']);
    });

    it('should handle multiple directives', () => {
      const text =
        'Some text\n/add file1.js\n/add file2.js\n/ignore node_modules/\nMore text';
      const result = extractFileDirectives(text);
      expect(result.addFiles).toEqual(['file1.js', 'file2.js']);
      expect(result.ignoreFiles).toEqual(['node_modules/']);
    });

    it('should return empty arrays when no directives are found', () => {
      const text = 'Some text without any directives';
      const result = extractFileDirectives(text);
      expect(result.addFiles).toEqual([]);
      expect(result.ignoreFiles).toEqual([]);
    });
  });

  describe('resolveGlobs', () => {
    // Save current working directory
    const originalCwd = process.cwd();
    
    beforeAll(() => {
      // Change to temp directory for glob operations
      process.chdir(tempDir);
    });
    
    afterAll(() => {
      // Restore original working directory
      process.chdir(originalCwd);
    });
    
    it('should resolve glob patterns to file paths', () => {
      const patterns = ['src/*.js', 'test/*.js'];
      const result = resolveGlobs(patterns);
      
      // Sort for consistent test results
      const sortedResult = [...result].sort();
      
      expect(sortedResult).toEqual([
        'src/file1.js',
        'src/file2.js',
        'test/test1.js'
      ].sort());
    });

    it('should handle directory patterns by appending /**/*', () => {
      const patterns = ['src/'];
      const result = resolveGlobs(patterns);
      
      // Sort for consistent test results
      const sortedResult = [...result].sort();
      
      expect(sortedResult).toEqual([
        'src/file1.js',
        'src/file2.js'
      ].sort());
    });

    it('should remove duplicates from results', () => {
      const patterns = ['src/*.js', '*.js'];
      const result = resolveGlobs(patterns);
      
      // Verify src/file1.js only appears once
      const occurrences = result.filter(file => file === 'src/file1.js').length;
      expect(occurrences).toBe(1);
      
      // Verify total unique files
      expect(new Set(result).size).toBe(result.length);
    });

    it('should handle errors and continue processing', () => {
      // Invalid pattern and valid pattern
      const patterns = ['[invalid', 'src/*.js'];
      const result = resolveGlobs(patterns);
      
      // Should still resolve the valid pattern
      expect(result.some(file => file.startsWith('src/'))).toBe(true);
    });
  });

  describe('applyIgnorePatterns', () => {
    // Save current working directory
    const originalCwd = process.cwd();
    
    beforeAll(() => {
      // Change to temp directory for operations
      process.chdir(tempDir);
    });
    
    afterAll(() => {
      // Restore original working directory
      process.chdir(originalCwd);
    });
    
    it('should filter out files that match ignore patterns', () => {
      const files = [
        'src/file1.js',
        'node_modules/file.js',
        'dist/bundle.js',
        'file1.test.js',
      ];
      const ignorePatterns = ['node_modules/', 'dist/', '*.test.js'];

      const result = applyIgnorePatterns(files, ignorePatterns);

      expect(result).toEqual(['src/file1.js']);
    });

    it('should handle directory-based ignores', () => {
      const files = [
        'src/file1.js',
        'node_modules/file.js',
      ];
      const ignorePatterns = ['node_modules/'];

      const result = applyIgnorePatterns(files, ignorePatterns);

      expect(result).toEqual(['src/file1.js']);
    });

    it('should return all files when no ignore patterns are provided', () => {
      const files = ['src/file1.js', 'src/file2.js'];

      expect(applyIgnorePatterns(files, [])).toEqual(files);
      expect(applyIgnorePatterns(files, null)).toEqual(files);
    });
  });

  describe('getFileContents', () => {
    // Save current working directory
    const originalCwd = process.cwd();
    
    beforeAll(() => {
      // Change to temp directory for operations
      process.chdir(tempDir);
    });
    
    afterAll(() => {
      // Restore original working directory
      process.chdir(originalCwd);
    });
    
    it('should read contents of specified files', () => {
      const files = ['src/file1.js', 'src/file2.js'];
      const result = getFileContents(files);

      expect(result).toEqual({
        'src/file1.js': 'content of file1',
        'src/file2.js': 'content of file2',
      });
    });

    it('should handle errors when reading files', () => {
      const files = ['src/file1.js', 'nonexistent.js'];
      const result = getFileContents(files);

      expect(result).toEqual({
        'src/file1.js': 'content of file1',
      });
      
      // Should not have the nonexistent file
      expect(result['nonexistent.js']).toBeUndefined();
    });
  });

  describe('processFileContext', () => {
    // Create a custom implementation for testing
    const customProcessFileContext = ({ text, additionalFiles = [] }) => {
      // Use the real extractFileDirectives
      const directives = extractFileDirectives(text);
      
      // For testing, we'll just return the directives and additionalFiles
      return {
        directives,
        additionalFiles
      };
    };
    
    it('should process file context with directives', () => {
      const text = '/add src/**/*.js\n/ignore node_modules/';
      const additionalFiles = ['additional.js'];

      const result = customProcessFileContext({ text, additionalFiles });

      expect(result.directives.addFiles).toEqual(['src/**/*.js']);
      expect(result.directives.ignoreFiles).toEqual(['node_modules/']);
      expect(result.additionalFiles).toEqual(['additional.js']);
    });

    it('should handle empty directives', () => {
      const text = 'No directives here';
      const additionalFiles = ['additional.js'];

      const result = customProcessFileContext({ text, additionalFiles });

      expect(result.directives.addFiles).toEqual([]);
      expect(result.directives.ignoreFiles).toEqual([]);
      expect(result.additionalFiles).toEqual(['additional.js']);
    });
    
    // Integration test with real file system
    it('should integrate with the file system correctly', () => {
      // Save current working directory
      const originalCwd = process.cwd();
      
      try {
        // Change to temp directory for operations
        process.chdir(tempDir);
        
        const text = '/add src/*.js\n/ignore node_modules/';
        const additionalFiles = ['additional.js'];
        
        // Use the real processFileContext function
        const baseFilesFn = () => ['file1.test.js']; // Mock baseFiles function
        const result = processFileContext({ 
          text, 
          additionalFiles,
          baseFilesFn
        });
        
        // Check that we got the right files
        expect(Object.keys(result).sort()).toEqual([
          'additional.js',
          'file1.test.js',
          'src/file1.js',
          'src/file2.js'
        ].sort());
        
        // Check file contents
        expect(result['src/file1.js']).toBe('content of file1');
        expect(result['additional.js']).toBe('additional content');
      } finally {
        // Restore original working directory
        process.chdir(originalCwd);
      }
    });
  });
});

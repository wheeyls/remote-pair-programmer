import fs from 'fs';
import { glob } from 'glob';
import {
  extractFileDirectives,
  resolveGlobs,
  applyIgnorePatterns,
  getFileContents,
  processFileContext
} from './fileContext';

// Mock dependencies
jest.mock('fs');
jest.mock('glob');

describe('fileContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      const text = 'Some text\n/add file1.js\n/add file2.js\n/ignore node_modules/\nMore text';
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
    it('should resolve glob patterns to file paths', () => {
      glob.sync.mockImplementation((pattern) => {
        if (pattern === 'src/**/*.js') return ['src/file1.js', 'src/file2.js'];
        if (pattern === 'test/*.js') return ['test/test1.js'];
        return [];
      });

      const patterns = ['src/**/*.js', 'test/*.js'];
      const result = resolveGlobs(patterns);
      
      expect(result).toEqual(['src/file1.js', 'src/file2.js', 'test/test1.js']);
      expect(glob.sync).toHaveBeenCalledTimes(2);
    });

    it('should handle directory patterns by appending /**/*', () => {
      glob.sync.mockImplementation((pattern) => {
        if (pattern === 'src/**/*') return ['src/file1.js', 'src/file2.js'];
        return [];
      });

      const patterns = ['src/'];
      const result = resolveGlobs(patterns);
      
      expect(result).toEqual(['src/file1.js', 'src/file2.js']);
      expect(glob.sync).toHaveBeenCalledWith('src/**/*', { nodir: true });
    });

    it('should remove duplicates from results', () => {
      glob.sync.mockImplementation((pattern) => {
        if (pattern === 'src/**/*.js') return ['src/file1.js', 'src/file2.js'];
        if (pattern === '*.js') return ['src/file1.js', 'file3.js'];
        return [];
      });

      const patterns = ['src/**/*.js', '*.js'];
      const result = resolveGlobs(patterns);
      
      expect(result).toEqual(['src/file1.js', 'src/file2.js', 'file3.js']);
    });

    it('should handle errors and continue processing', () => {
      glob.sync.mockImplementationOnce(() => {
        throw new Error('Glob error');
      }).mockImplementationOnce(() => ['test/test1.js']);

      const patterns = ['src/**/*.js', 'test/*.js'];
      const result = resolveGlobs(patterns);
      
      expect(result).toEqual(['test/test1.js']);
      expect(glob.sync).toHaveBeenCalledTimes(2);
    });
  });

  describe('applyIgnorePatterns', () => {
    beforeEach(() => {
      glob.sync.mockImplementation((pattern) => {
        if (pattern === 'node_modules/**/*') return ['node_modules/file1.js'];
        if (pattern === 'dist/**/*') return ['dist/bundle.js'];
        if (pattern === '*.test.js') return ['file1.test.js', 'file2.test.js'];
        return [];
      });
    });

    it('should filter out files that match ignore patterns', () => {
      const files = [
        'src/file1.js',
        'node_modules/file1.js',
        'dist/bundle.js',
        'file1.test.js'
      ];
      const ignorePatterns = ['node_modules/', 'dist/', '*.test.js'];
      
      const result = applyIgnorePatterns(files, ignorePatterns);
      
      expect(result).toEqual(['src/file1.js']);
    });

    it('should handle directory-based ignores', () => {
      const files = [
        'src/file1.js',
        'node_modules/file1.js',
        'node_modules/subdir/file2.js'
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
    beforeEach(() => {
      fs.readFileSync.mockImplementation((file) => {
        if (file === 'src/file1.js') return 'content of file1';
        if (file === 'src/file2.js') return 'content of file2';
        throw new Error('File not found');
      });
    });

    it('should read contents of specified files', () => {
      const files = ['src/file1.js', 'src/file2.js'];
      const result = getFileContents(files);
      
      expect(result).toEqual({
        'src/file1.js': 'content of file1',
        'src/file2.js': 'content of file2'
      });
      expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    });

    it('should handle errors when reading files', () => {
      const files = ['src/file1.js', 'nonexistent.js'];
      const result = getFileContents(files);
      
      expect(result).toEqual({
        'src/file1.js': 'content of file1'
      });
      expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('processFileContext', () => {
    beforeEach(() => {
      // Mock resolveGlobs
      glob.sync.mockImplementation((pattern) => {
        if (pattern === 'src/**/*.js') return ['src/file1.js', 'src/file2.js'];
        if (pattern === 'node_modules/**/*') return ['node_modules/file.js'];
        return [];
      });

      // Mock getFileContents
      fs.readFileSync.mockImplementation((file) => {
        if (file === 'src/file1.js') return 'content of file1';
        if (file === 'src/file2.js') return 'content of file2';
        if (file === 'additional.js') return 'additional content';
        return '';
      });
    });

    it('should process file context with directives', () => {
      const text = '/add src/**/*.js\n/ignore node_modules/';
      const additionalFiles = ['additional.js'];
      
      const result = processFileContext({ text, additionalFiles });
      
      expect(result).toEqual({
        'src/file1.js': 'content of file1',
        'src/file2.js': 'content of file2',
        'additional.js': 'additional content'
      });
    });

    it('should handle empty directives', () => {
      const text = 'No directives here';
      const additionalFiles = ['additional.js'];
      
      const result = processFileContext({ text, additionalFiles });
      
      expect(result).toEqual({
        'additional.js': 'additional content'
      });
    });
  });
});

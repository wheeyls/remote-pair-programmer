import { jest } from '@jest/globals';
import fs from 'fs';
import { extractCodeChanges } from '../../src/codeChanges/aiUtils.js';

describe('aiUtils', () => {
  let responseText;

  describe('extractCodeChanges', () => {
    beforeEach(() => {
      responseText = fs.readFileSync('./tests/fixtures/codeChanges/responses/simple.txt', 'utf-8');
    });

    it('removes section headers from explanation', () => {
      expect(extractCodeChanges(responseText)).not.toContain('EXPLANATION:');
      expect(extractCodeChanges(responseText)).not.toContain('CHANGES:');
    });
  })
});

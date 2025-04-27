// Silence console output during tests to keep the output clean
import { jest } from '@jest/globals';

const originalConsole = { ...console };

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console
  Object.assign(console, originalConsole);
});

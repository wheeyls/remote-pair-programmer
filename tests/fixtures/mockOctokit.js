import { jest } from '@jest/globals';

// Mock Octokit
export const mockOctokit = {
  issues: {
    createComment: jest.fn().mockResolvedValue({}),
    listComments: jest.fn().mockResolvedValue({
      data: [
        {
          body: '@test-bot change this code please',
          user: {
            login: 'test-bot',
          },
        },
      ],
    }),
    get: jest.fn().mockResolvedValue({
      data: {
        body: '@test-bot change this code please',
      },
    }),
  },
};

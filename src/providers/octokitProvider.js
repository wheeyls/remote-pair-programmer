import { setProvided, getProvided } from './provider.js';

/**
 * Sets the current octokit instance for the duration of the callback.
 * Delegates to the generic provider.
 *
 * @param {Object} octokit - The octokit instance to set.
 * @param {Function} callback - The function to execute with the scoped octokit.
 * @returns {*} The result of the callback.
 */
async function setOctokit(octokit, callback) {
  return await setProvided('octokit', octokit, callback);
}

/**
 * Retrieves the current octokit instance.
 * Delegates to the generic provider.
 *
 * @returns {Object} The current octokit instance.
 * @throws {Error} If no octokit instance is available.
 */
function getOctokit() {
  const instance = getProvided('octokit');
  if (!instance) {
    throw new Error('No octokit instance set in the current scope');
  }
  return instance;
}

export { setOctokit, getOctokit };

// Generic provider for managing scoped instances by name.
// Maintains a stack for each provided name to allow nested scopes.
const providedStacks = {};

export async function setProvided(name, instance, callback) {
  if (!providedStacks[name]) {
    providedStacks[name] = [];
  }
  providedStacks[name].push(instance);
  try {
    return await callback();
  } finally {
    providedStacks[name].pop();
  }
}

export function getProvided(name) {
  if (!providedStacks[name] || providedStacks[name].length === 0) {
    throw new Error(`No instance provided for "${name}" in the current scope`);
  }
  return providedStacks[name][providedStacks[name].length - 1];
}

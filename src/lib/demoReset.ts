import { isDemoMode } from './env';

/**
 * Clears persisted demo state and returns to the seed.
 *
 * Exists so Account can offer a Reset control without importing `src/dev/`
 * directly — a non-demo production build blocks that directory, and a static
 * import would fail to resolve there.
 *
 * No-op outside demo mode.
 */
export function resetDemo(): void {
  if (!isDemoMode) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- src/dev is blocked from non-demo production bundles
  const { resetDemoState } = require('../dev/demoApi') as typeof import('../dev/demoApi');
  resetDemoState();
}

export { isDemoMode };

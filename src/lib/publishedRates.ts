import { isDemoMode } from './env';

/**
 * The website's published starting price for a vehicle class.
 *
 * Lives here rather than in `src/dev/` alone because a non-demo production
 * build blocks `src/dev/`, and the fleet screen must still compile there. The
 * lazy require keeps the seeded module out of that bundle.
 *
 * Returns null outside demo mode: a real build should show whatever the API
 * returns, and the day the backend carries a published label this function is
 * where it gets read from instead.
 */
export function publishedRateFor(vehicleType: string): string | null {
  if (!isDemoMode) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- src/dev is blocked from non-demo production bundles
  const { WEBSITE_PUBLISHED_RATES } = require('../dev/demoData') as typeof import('../dev/demoData');
  return WEBSITE_PUBLISHED_RATES[vehicleType] ?? null;
}

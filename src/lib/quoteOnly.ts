import { isDemoMode } from './env';

/**
 * Vehicle classes the business will not price without being asked.
 *
 * The website marks Executive Sprinter, Mini Coach and Motor Coach "Request
 * Quote". If the app shows a computed number for one of them it commits LCT to a
 * price they have explicitly said they do not give — exactly the same failure as
 * printing an invented cancellation window. When the business has not published
 * a figure, the app does not produce one.
 *
 * Outside demo mode this returns false, because the live API is the authority on
 * what it will and will not price; the day it carries a `quote_only` flag, this
 * is the one place that reads it.
 */
export function isQuoteOnly(vehicleType: string): boolean {
  if (!isDemoMode) return false;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- src/dev is blocked from non-demo production bundles
  const { QUOTE_ONLY_VEHICLE_TYPES } = require('../dev/demoData') as typeof import('../dev/demoData');
  return QUOTE_ONLY_VEHICLE_TYPES.includes(vehicleType);
}

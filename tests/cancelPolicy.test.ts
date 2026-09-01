import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CUSTOMER_CANCELLABLE,
  TRIP_STAGE_ORDER,
  isCustomerCancellable,
  type TripStatus,
} from '../src/lib/tripStatus';
import { CANCELLATION_FEE_TIERS_PUBLISHED, freeCancellationHoursFor } from '../src/config/servicePolicy';
import type { ServiceType } from '../src/types/api';

/**
 * THE CANCEL, AND THE FIGURE IT MUST NOT PRINT.
 *
 * Two separate claims are asserted here, because they fail in different ways.
 *
 * 1. WHERE CANCEL IS OFFERED. A control that appears on a ride the customer is
 *    already sitting in is a control that fails when pressed. The interesting
 *    half is the REFUSALS, so those are enumerated explicitly rather than
 *    derived from the same list the app derives from — a test that recomputes
 *    the implementation cannot disagree with it.
 *
 * 2. THAT NO CANCELLATION FEE REACHES THE SCREEN. `servicePolicy.ts` carries
 *    the tiers the website publishes, and whether the app may assert a charge
 *    is unanswered (OPEN_QUESTIONS.md 14c). This is the kind of rule that is
 *    kept by nobody noticing, so it is asserted against the SOURCE of the
 *    component: the same shape as `observedRateCardContainment`.
 */

const CANCEL_SRC = readFileSync(join(__dirname, '..', 'src', 'components', 'trip', 'CancelBooking.tsx'), 'utf8');
const RECORD_SRC = readFileSync(join(__dirname, '..', 'src', 'components', 'trip', 'CancelledRecord.tsx'), 'utf8');

/** Everything the source says outside comments — comments discuss the rule. */
function codeOf(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('where a customer may cancel', () => {
  it('offers cancel before the passenger is aboard', () => {
    for (const status of ['pending', 'confirmed', 'driver_assigned', 'driver_arriving'] as TripStatus[]) {
      expect(isCustomerCancellable(status)).toBe(true);
    }
  });

  /*
   * The half that matters. Written out rather than computed, so that adding a
   * status to CUSTOMER_CANCELLABLE cannot make this test agree with it.
   */
  it('REFUSES cancel once the ride is under way, and on both terminal statuses', () => {
    for (const status of ['passenger_picked_up', 'trip_started', 'completed', 'cancelled'] as TripStatus[]) {
      expect(isCustomerCancellable(status)).toBe(false);
    }
  });

  it('names only statuses that exist in the stage order', () => {
    for (const status of CUSTOMER_CANCELLABLE) {
      expect(TRIP_STAGE_ORDER).toContain(status);
    }
  });

  it('is a contiguous prefix of the stage order — there is no gap a status could fall into', () => {
    const indices = CUSTOMER_CANCELLABLE.map((s) => TRIP_STAGE_ORDER.indexOf(s)).sort((a, b) => a - b);
    expect(indices).toEqual(indices.map((_, i) => i));
  });
});

describe('the confirmation states a window, and never a charge', () => {
  it('resolves a real window for every service type the policy covers', () => {
    // Not asserting the NUMBERS — those are the business's, and `servicePolicy`
    // is where they are recorded with their source. Asserting only that a
    // service type either has one or is honestly null.
    const ALL: ServiceType[] = ['airport', 'corporate', 'events', 'point_to_point', 'hourly', 'custom'];
    for (const type of ALL) {
      const hours = freeCancellationHoursFor(type);
      expect(hours === null || (typeof hours === 'number' && hours > 0)).toBe(true);
    }
  });

  it('treats an unknown service type as INSIDE the window, never outside it', () => {
    // The app must not tell a customer they have missed a deadline it cannot
    // compute. `null` is the signal, and the component's guard reads it.
    expect(freeCancellationHoursFor(null)).toBeNull();
    expect(codeOf(CANCEL_SRC)).toContain('windowHours === null');
  });

  it('renders no currency symbol and no digit-with-decimals anywhere', () => {
    const code = codeOf(CANCEL_SRC);
    // `$` only where it is NOT template interpolation — `${windowHours}` is a
    // dollar sign to a naive grep and is not a price.
    expect(code).not.toMatch(/\$(?!\{)/);
    expect(code).not.toMatch(/\d+\.\d{2}/);
  });

  it('does not read the published fee tiers', () => {
    expect(CANCEL_SRC).not.toMatch(/CANCELLATION_FEE_TIERS_PUBLISHED\s*[.[]/);
    // The tiers exist and are recorded — this test would be vacuous if they did not.
    expect(Object.keys(CANCELLATION_FEE_TIERS_PUBLISHED).length).toBeGreaterThan(0);
  });

  it('routes to dispatch rather than to a number when the window has passed', () => {
    expect(codeOf(CANCEL_SRC)).toContain('servicePolicy.dispatchPhone');
  });
});

describe('the cancelled record shows no money', () => {
  it('renders no fare, no zero and no formatted currency', () => {
    const code = codeOf(RECORD_SRC);
    expect(code).not.toMatch(/\$/);
    expect(code).not.toMatch(/formatCurrency/);
    expect(code).not.toMatch(/total_fare/);
  });

  it('says plainly that nothing was charged', () => {
    expect(RECORD_SRC).toContain('Nothing was charged for this ride.');
  });
});

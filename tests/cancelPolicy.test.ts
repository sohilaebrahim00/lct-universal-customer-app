import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CUSTOMER_CANCELLABLE,
  TRIP_STAGE_ORDER,
  isCustomerCancellable,
  type TripStatus,
} from '../src/lib/tripStatus';
import {
  CANCELLATION_FEE_TIERS_PUBLISHED,
  cancellationTiersFor,
  feeTierBandFor,
  freeCancellationHoursFor,
} from '../src/config/servicePolicy';
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
 * 2. THAT THE APP STATES POLICY AND NEVER COMPUTES A CHARGE. The published
 *    tiers ARE rendered — they are the client's own figures from their own
 *    policy page, and this app has printed the free window from the same
 *    paragraph for weeks. What must never appear is a currency amount or any
 *    arithmetic against this booking's fare, and the waiver must stay out
 *    because a discretion beside a confirm button reads as an entitlement.
 *
 *    This is the kind of rule kept by nobody noticing, so it is asserted
 *    against the SOURCE of the component — the same shape as
 *    `observedRateCardContainment`.
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

  /*
   * The app states POLICY. It never states what THIS customer owes.
   *
   * That distinction is the whole rule: "Within 12 hours — 50% of the fare" is
   * the client's published sentence; "$97.15" would be this app computing a
   * charge against this booking, which nothing has authorised it to do.
   */
  it('computes no charge — no currency amount, no arithmetic on a fare', () => {
    const code = codeOf(CANCEL_SRC);
    // `$` only where it is NOT template interpolation — `${windowHours}` is a
    // dollar sign to a naive grep and is not a price.
    expect(code).not.toMatch(/\$(?!\{)/);
    expect(code).not.toMatch(/\d+\.\d{2}/);
    expect(code).not.toMatch(/total_fare|formatCurrency|\* *0\.5|\/ *2\b/);
  });

  it('states the published tiers VERBATIM, never a reworded version', () => {
    // Rendered through `cancellationTiersFor`, so what reaches the screen is
    // the string recorded from the policy page. A component that retyped them
    // could drift from the source it cites, which is worse than silence.
    expect(codeOf(CANCEL_SRC)).toContain('cancellationTiersFor');
    for (const band of ['sedansAndSuvs', 'airport', 'hourlyAndEvents'] as const) {
      for (const tier of CANCELLATION_FEE_TIERS_PUBLISHED[band]) {
        expect(CANCEL_SRC).not.toContain(tier);
      }
    }
  });

  it('cites where the tiers came from', () => {
    expect(codeOf(CANCEL_SRC)).toContain('CANCELLATION_FEE_TIERS_PUBLISHED.source');
    expect(CANCELLATION_FEE_TIERS_PUBLISHED.source).toBe('lctuniversal.com/cancellation-policy');
    expect(CANCELLATION_FEE_TIERS_PUBLISHED.readOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  /*
   * The waiver is the one thing still withheld, and for a different reason than
   * the tiers were: "may be waived at the company's discretion" is a discretion,
   * and rendering it beside a confirm button reads as an entitlement.
   */
  it('does NOT render the weather/emergency waiver', () => {
    expect(CANCEL_SRC).not.toContain(CANCELLATION_FEE_TIERS_PUBLISHED.weather);
    expect(codeOf(CANCEL_SRC)).not.toMatch(/\.weather\b/);
  });

  /**
   * ONE MAPPING, ASSERTED — not two switches that look alike.
   *
   * The free window and the tier band that begins where it ends are the same
   * sentence on the policy page. If these two ever disagree, a screen says
   * "free until 6 hours before" above a tier taken from the 12-hour band.
   */
  it('resolves the window and the tier band from the same service grouping', () => {
    const expected: Record<ServiceType, string | null> = {
      airport: 'airport',
      corporate: 'sedansAndSuvs',
      point_to_point: 'sedansAndSuvs',
      events: 'hourlyAndEvents',
      hourly: 'hourlyAndEvents',
      custom: null,
    };
    for (const type of Object.keys(expected) as ServiceType[]) {
      expect(feeTierBandFor(type)).toBe(expected[type]);
      // A service with a window has tiers, and one without has neither. No
      // service type is free-window-known and tier-unknown, or the reverse.
      expect(cancellationTiersFor(type) === null).toBe(freeCancellationHoursFor(type) === null);
    }
    expect(feeTierBandFor(null)).toBeNull();
    expect(cancellationTiersFor(null)).toBeNull();
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

import { describe, expect, it } from '@jest/globals';
import {
  DRIVER_AVAILABILITY_LABELS,
  driverAvailability,
  findDriverConflicts,
  hasBlockingConflict,
  nextAssignment,
  occupiedWindow,
} from '../src/lib/operations';
import type { TimelineEvent } from '../src/lib/rideTimeline';
import type { Booking } from '../src/types/api';
import type { TripStatus } from '../src/lib/tripStatus';

/**
 * DRIVER AVAILABILITY AND DOUBLE-BOOKING.
 *
 * The assertions that matter most here are the ones about NOT KNOWING. A
 * point-to-point ride's routed duration is computed by Google Directions at
 * booking time and is never persisted, so most future rides have no end time —
 * and the honest answer to "does this collide" is "cannot rule it out", not a
 * number derived from an average speed nobody chose.
 */

let n = 0;
function booking(over: Partial<Booking> & { scheduled_at: string }): Booking {
  n += 1;
  return {
    id: `b${n}`,
    user_id: 'u1',
    vehicle_id: 'demo-vehicle-sedan',
    service_type: 'point_to_point',
    status: 'driver_assigned' as TripStatus,
    pickup_address: '4820 Maple Ave, Dallas, TX',
    dropoff_address: 'DFW Terminal D',
    hourly_duration_hours: null,
    distance_miles: '10',
    total_fare: '180.06',
    currency: 'usd',
    created_at: over.scheduled_at,
    ...over,
  } as Booking;
}

const T = (hhmm: string) => `2026-09-14T${hhmm}:00.000Z`;

describe('driver availability', () => {
  it('is available with nothing live on the board', () => {
    expect(driverAvailability([])).toBe('available');
    expect(driverAvailability([booking({ scheduled_at: T('14:00'), status: 'completed' })])).toBe('available');
    expect(driverAvailability([booking({ scheduled_at: T('14:00'), status: 'cancelled' })])).toBe('available');
  });

  it('is assigned when holding future work that has not moved', () => {
    expect(driverAvailability([booking({ scheduled_at: T('14:00'), status: 'driver_assigned' })])).toBe('assigned');
  });

  it('is en route on the way to a pickup', () => {
    expect(driverAvailability([booking({ scheduled_at: T('14:00'), status: 'driver_arriving' })])).toBe('en_route');
  });

  it('is on trip once the passenger is aboard', () => {
    expect(driverAvailability([booking({ scheduled_at: T('14:00'), status: 'passenger_picked_up' })])).toBe('on_trip');
    expect(driverAvailability([booking({ scheduled_at: T('14:00'), status: 'trip_started' })])).toBe('on_trip');
  });

  /*
   * The most committed state wins. A driver mid-ride who also holds a later
   * booking is ON TRIP — that is the state stopping them taking work, and
   * reporting "assigned" would read as free-ish.
   */
  it('reports the most committed state when a driver holds several rides', () => {
    const held = [
      booking({ scheduled_at: T('14:00'), status: 'trip_started' }),
      booking({ scheduled_at: T('18:00'), status: 'driver_assigned' }),
    ];
    expect(driverAvailability(held)).toBe('on_trip');
  });

  it('labels every state for an operator', () => {
    expect(Object.values(DRIVER_AVAILABILITY_LABELS)).toEqual(['Available', 'Assigned', 'En route', 'On trip']);
  });

  it('finds the next place a driver has to be, ignoring finished work', () => {
    const now = new Date(T('12:00'));
    const held = [
      booking({ scheduled_at: T('18:00'), status: 'driver_assigned' }),
      booking({ scheduled_at: T('09:00'), status: 'completed' }),
      booking({ scheduled_at: T('15:00'), status: 'driver_assigned' }),
    ];
    expect(nextAssignment(held, now)!.scheduled_at).toBe(T('15:00'));
  });

  it('has no next assignment when everything is behind them', () => {
    const now = new Date(T('20:00'));
    expect(nextAssignment([booking({ scheduled_at: T('09:00') })], now)).toBeNull();
  });
});

describe('the window a ride occupies', () => {
  it('ends where an hourly booking says it ends', () => {
    const b = booking({ scheduled_at: T('14:00'), service_type: 'hourly', hourly_duration_hours: 3 });
    const w = occupiedWindow(b);
    expect(w.endSource).toBe('hourly');
    expect(w.end).toBe(Date.parse(T('17:00')));
  });

  it('ends where a recorded completion says it ended', () => {
    const b = booking({ scheduled_at: T('14:00'), status: 'completed' });
    const events: TimelineEvent[] = [{ status: 'completed', note: null, created_at: T('15:30') }];
    const w = occupiedWindow(b, events);
    expect(w.endSource).toBe('recorded');
    expect(w.end).toBe(Date.parse(T('15:30')));
  });

  /**
   * THE ONE THAT KEEPS A GUESS OUT. A placeholder completion time must not
   * become a window — `recordedAt` ignores estimated events, so the ride falls
   * through to `unknown` exactly as if nothing had been recorded at all.
   */
  it('refuses an ESTIMATED completion and reports the end as unknown', () => {
    const b = booking({ scheduled_at: T('14:00'), status: 'completed' });
    const events: TimelineEvent[] = [{ status: 'completed', note: null, created_at: T('15:30'), estimated: true }];
    const w = occupiedWindow(b, events);
    expect(w.endSource).toBe('unknown');
    expect(w.end).toBeNull();
  });

  it('has no end for an unfinished point-to-point ride', () => {
    const w = occupiedWindow(booking({ scheduled_at: T('14:00') }));
    expect(w.endSource).toBe('unknown');
    expect(w.end).toBeNull();
  });
});

describe('driver conflicts', () => {
  const hourly = (start: string, hours: number, over: Partial<Booking> = {}) =>
    booking({ scheduled_at: start, service_type: 'hourly', hourly_duration_hours: hours, ...over });

  it('reports a genuine overlap when both ends are known', () => {
    const held = hourly(T('14:00'), 2); // 14:00–16:00
    const candidate = hourly(T('15:00'), 2); // 15:00–17:00
    const conflicts = findDriverConflicts(candidate, [held]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.severity).toBe('overlap');
    expect(conflicts[0]!.bookingId).toBe(held.id);
    expect(hasBlockingConflict(conflicts)).toBe(true);
  });

  it('allows back-to-back work that does not actually overlap', () => {
    const held = hourly(T('14:00'), 2); // ends 16:00
    const candidate = hourly(T('16:00'), 2); // starts 16:00
    expect(findDriverConflicts(candidate, [held])).toEqual([]);
  });

  it('allows work on a different day', () => {
    const held = hourly('2026-09-15T14:00:00.000Z', 2);
    const candidate = booking({ scheduled_at: T('14:00') });
    expect(findDriverConflicts(candidate, [held])).toEqual([]);
  });

  /**
   * THE CONSERVATIVE HALF. An unfinished point-to-point ride has no recorded
   * end, so a later ride on the same day cannot be declared safe — and is
   * reported as POSSIBLE rather than waved through or blocked outright.
   */
  it('cannot rule out a collision when the held ride has no known end', () => {
    const held = booking({ scheduled_at: T('14:00') }); // unknown end
    const candidate = booking({ scheduled_at: T('15:00') });
    const conflicts = findDriverConflicts(candidate, [held]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.severity).toBe('possible');
    expect(conflicts[0]!.reason).toContain('duration is not recorded');
    // Possible is not blocking — it is a warning a dispatcher reads.
    expect(hasBlockingConflict(conflicts)).toBe(false);
  });

  it('warns the other way round too, when the NEW ride has no known end', () => {
    const held = hourly(T('18:00'), 1);
    const candidate = booking({ scheduled_at: T('14:00') }); // unknown end, earlier
    const conflicts = findDriverConflicts(candidate, [held]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.severity).toBe('possible');
  });

  it('holds nobody once a ride is cancelled', () => {
    const held = booking({ scheduled_at: T('14:00'), status: 'cancelled' });
    expect(findDriverConflicts(booking({ scheduled_at: T('15:00') }), [held])).toEqual([]);
  });

  it('does not conflict a booking with itself', () => {
    const b = hourly(T('14:00'), 2);
    expect(findDriverConflicts(b, [b])).toEqual([]);
  });

  /*
   * A finished ride with a recorded end frees the driver from that moment. The
   * same ride WITHOUT a recorded end does not — which is the difference
   * between history and an assumption, and the whole reason events are worth
   * recording.
   */
  it('frees the driver after a recorded completion, but not after an unrecorded one', () => {
    const held = booking({ scheduled_at: T('14:00'), status: 'completed' });
    const candidate = hourly(T('15:00'), 1);

    const withRecord = findDriverConflicts(candidate, [held], {
      [held.id]: [{ status: 'completed', note: null, created_at: T('14:30') }],
    });
    expect(withRecord).toEqual([]);

    const withoutRecord = findDriverConflicts(candidate, [held]);
    expect(withoutRecord).toHaveLength(1);
    expect(withoutRecord[0]!.severity).toBe('possible');
  });

  it('carries enough detail for the dispatcher to act on', () => {
    const held = hourly(T('14:00'), 2, { pickup_address: 'Hotel Crescent Court' });
    const conflicts = findDriverConflicts(hourly(T('15:00'), 2), [held]);
    expect(conflicts[0]!.pickup).toBe('Hotel Crescent Court');
    expect(conflicts[0]!.status).toBe('driver_assigned');
    expect(conflicts[0]!.from).toBe(T('14:00'));
    expect(conflicts[0]!.until).toBe(T('16:00'));
  });
});

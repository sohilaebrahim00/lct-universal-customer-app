import { describe, expect, it } from '@jest/globals';
import {
  formatDuration,
  hasRecordedTimes,
  recordedAt,
  rideMetrics,
  rideTimeline,
  type TimelineEvent,
} from '../src/lib/rideTimeline';

/**
 * THE RIDE HISTORY, AND THE RULE THAT MAKES IT WORTH SHOWING.
 *
 * The client asked for the history of a ride: what happened and when. The only
 * honest answer is an event the system wrote down as it happened, so the whole
 * of this module turns on one distinction — a RECORDED time against an
 * ESTIMATED one — and most of these assertions are about the estimated side,
 * because that is the side that can lie.
 *
 * `src/dev/demoData.ts` seeds a completed ride with timestamps "evenly spaced
 * across the four hours before pickup". They order the list and they mean
 * nothing. Rendering one as "Ride started 1:17 AM" would be inventing the
 * single thing the client actually asked to see.
 */

const at = (iso: string) => new Date(iso).toISOString();

/** A ride driven through for real: every stage stamped when it happened. */
const recorded: TimelineEvent[] = [
  { status: 'confirmed', note: null, created_at: at('2026-09-13T00:30:00Z') },
  { status: 'driver_assigned', note: null, created_at: at('2026-09-13T00:40:00Z') },
  { status: 'driver_arriving', note: null, created_at: at('2026-09-13T00:47:00Z') },
  { status: 'passenger_picked_up', note: null, created_at: at('2026-09-13T01:17:00Z') },
  { status: 'trip_started', note: null, created_at: at('2026-09-13T01:20:00Z') },
  { status: 'completed', note: null, created_at: at('2026-09-13T02:26:00Z') },
];

/** The seeded ride: the stages are real, the clock is a placeholder. */
const seeded: TimelineEvent[] = recorded.map((e) => ({ ...e, estimated: true }));

describe('the timeline', () => {
  it('labels each stage in words an operator would use', () => {
    const rows = rideTimeline(recorded);
    expect(rows.map((r) => r.label)).toEqual([
      'Confirmed',
      'Chauffeur assigned',
      'En route to pickup',
      'Passenger on board',
      'Ride started',
      'Ride completed',
    ]);
  });

  it('orders by the recorded time, not by the order it was handed them', () => {
    const shuffled = [recorded[5]!, recorded[0]!, recorded[3]!];
    expect(rideTimeline(shuffled).map((r) => r.status)).toEqual([
      'confirmed',
      'passenger_picked_up',
      'completed',
    ]);
  });

  /**
   * THE ONE THAT MATTERS. An estimated event still appears — the stage really
   * did happen — but carries NO time, because nobody recorded one.
   */
  it('shows an estimated stage with no clock beside it', () => {
    const rows = rideTimeline(seeded);
    expect(rows).toHaveLength(6);
    for (const row of rows) expect(row.at).toBeNull();
    // And it is still ordered, using the state machine rather than a clock.
    expect(rows.map((r) => r.status)).toEqual([
      'confirmed',
      'driver_assigned',
      'driver_arriving',
      'passenger_picked_up',
      'trip_started',
      'completed',
    ]);
  });

  it('keeps real times when a ride is part recorded and part seeded', () => {
    const mixed: TimelineEvent[] = [
      { ...recorded[0]!, estimated: true },
      recorded[5]!,
    ];
    const rows = rideTimeline(mixed);
    expect(rows.find((r) => r.status === 'confirmed')!.at).toBeNull();
    expect(rows.find((r) => r.status === 'completed')!.at).toBe(recorded[5]!.created_at);
  });

  it('has nothing to say about a ride with no events', () => {
    expect(rideTimeline([])).toEqual([]);
    expect(hasRecordedTimes([])).toBe(false);
  });

  it('knows whether any time in the ride was actually recorded', () => {
    expect(hasRecordedTimes(recorded)).toBe(true);
    expect(hasRecordedTimes(seeded)).toBe(false);
  });
});

describe('recordedAt', () => {
  it('returns the moment a stage was reached', () => {
    expect(recordedAt(recorded, 'trip_started')).toBe(at('2026-09-13T01:20:00Z'));
  });

  it('refuses an estimated time rather than passing it off as recorded', () => {
    expect(recordedAt(seeded, 'trip_started')).toBeNull();
  });

  it('is null for a stage the ride never reached', () => {
    expect(recordedAt(recorded, 'cancelled')).toBeNull();
  });
});

describe('durations', () => {
  it('reads the way the brief asks for', () => {
    expect(formatDuration(at('2026-09-13T01:17:00Z'), at('2026-09-13T02:26:00Z'))).toBe('1 hr 9 min');
    expect(formatDuration(at('2026-09-13T00:47:00Z'), at('2026-09-13T01:14:00Z'))).toBe('27 min');
    expect(formatDuration(at('2026-09-13T01:14:00Z'), at('2026-09-13T01:17:00Z'))).toBe('3 min');
  });

  it('drops the minutes when there are none', () => {
    expect(formatDuration(at('2026-09-13T01:00:00Z'), at('2026-09-13T03:00:00Z'))).toBe('2 hr');
  });

  /*
   * A blank and a zero are different claims. "0 min" says the measurement was
   * taken and came out at nothing; null says nobody measured.
   */
  it('is null — never "0 min" — when either end is missing', () => {
    expect(formatDuration(null, at('2026-09-13T02:26:00Z'))).toBeNull();
    expect(formatDuration(at('2026-09-13T01:17:00Z'), null)).toBeNull();
    expect(formatDuration(null, null)).toBeNull();
  });

  it('is null rather than negative when the clocks disagree', () => {
    expect(formatDuration(at('2026-09-13T02:26:00Z'), at('2026-09-13T01:17:00Z'))).toBeNull();
  });

  it('is null on an unparseable time rather than NaN', () => {
    expect(formatDuration('not a date', at('2026-09-13T01:17:00Z'))).toBeNull();
  });
});

describe('ride metrics', () => {
  const arrived = at('2026-09-13T01:14:00Z');

  it('derives all four when the times are there', () => {
    const m = rideMetrics(recorded, arrived);
    expect(m.travelToPickup).toBe('27 min'); // 00:47 → 01:14
    expect(m.waitingAtPickup).toBe('3 min'); // 01:14 → 01:17
    expect(m.rideDuration).toBe('1 hr 6 min'); // 01:20 → 02:26
    expect(m.totalOperational).toBe('1 hr 39 min'); // 00:47 → 02:26
  });

  /**
   * ARRIVAL IS NOT A STATUS, so two of the four depend on a timestamp the
   * backend has no column for (gap C-4). Null is the ordinary answer against a
   * real server, and it must stay blank rather than collapsing to a number.
   */
  it('returns null for the two that need an arrival time when there is none', () => {
    const m = rideMetrics(recorded, null);
    expect(m.travelToPickup).toBeNull();
    expect(m.waitingAtPickup).toBeNull();
    // The two that need only events still work.
    expect(m.rideDuration).toBe('1 hr 6 min');
    expect(m.totalOperational).toBe('1 hr 39 min');
  });

  /**
   * THE ASSERTION THAT STOPS A FABRICATED DURATION.
   *
   * Every seeded timestamp is a placeholder, so every duration derived from
   * them would be a fabricated measurement of a real ride. All four must be
   * null — not approximate, not "about an hour". Null.
   */
  it('derives NOTHING from estimated events', () => {
    const m = rideMetrics(seeded, arrived);
    expect(m.travelToPickup).toBeNull();
    expect(m.waitingAtPickup).toBeNull();
    expect(m.rideDuration).toBeNull();
    expect(m.totalOperational).toBeNull();
  });

  it('is all null for a ride with no events at all', () => {
    expect(rideMetrics([], null)).toEqual({
      travelToPickup: null,
      waitingAtPickup: null,
      rideDuration: null,
      totalOperational: null,
    });
  });
});

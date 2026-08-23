import { describe, expect, it } from '@jest/globals';
import {
  RIDE_STAGES,
  canMarkArrived,
  chauffeurAction,
  customerHeadline,
  etaIsAttributable,
  hasReached,
  stageFor,
  waitingWindow,
  waitingSentence,
  type RideStage,
} from '../src/lib/rideStage';
import { TRIP_STAGE_ORDER, type TripStatus } from '../src/lib/tripStatus';

/**
 * THE RIDE LIFECYCLE.
 *
 * ── How a state machine gets verified, decided before it was built ──────────
 * A screenshot at one moment cannot verify a sequence, the same way a
 * screenshot at one width could not verify a layout. So correctness here is
 * split three ways, and only the first two live in this file:
 *
 *   1. **Transitions, as pure functions.** Every stage derived from every
 *      (status, arrivedAt) pair, including the pairs that must be REFUSED.
 *      Deterministic, exhaustive, no clock.
 *   2. **A full run through the lifecycle**, asserting the stage advances in
 *      order and never skips, repeats or reverses. A sequence assertion, not a
 *      snapshot.
 *   3. **A driven browser walk** — a chauffeur action, then the customer and
 *      dispatcher views read back. That one is not a unit test and lives in
 *      the gate run, because it is the only way to prove the three views share
 *      a store rather than each holding their own copy.
 *
 * ── What none of it proves, stated here rather than discovered later ────────
 * - **Real elapsed time.** The waiting window is tested against an injected
 *   `now`. Nothing here waits 30 minutes, so nothing here proves the countdown
 *   is correct after 30 real minutes on a device that slept.
 * - **Propagation between people.** The demo store is `localStorage` in one
 *   browser. Two views in one tab share it; two phones do not. A real
 *   dispatcher moving a real customer's screen needs the socket in G-3, which
 *   does not exist.
 * - **That the backend can do any of this.** It cannot; see C-4.
 */

const ARRIVED = '2026-08-23T19:42:00.000Z';

describe('stageFor — the overlay, and what it refuses', () => {
  it('maps every backend status to a stage', () => {
    expect(stageFor('pending', null)).toBe('confirmed');
    expect(stageFor('confirmed', null)).toBe('confirmed');
    expect(stageFor('driver_assigned', null)).toBe('chauffeur_assigned');
    expect(stageFor('driver_arriving', null)).toBe('chauffeur_en_route');
    expect(stageFor('passenger_picked_up', null)).toBe('passenger_picked_up');
    expect(stageFor('trip_started', null)).toBe('trip_in_progress');
    expect(stageFor('completed', null)).toBe('completed');
  });

  it('derives arrived_at_pickup from driver_arriving plus a timestamp', () => {
    // The whole of C-4's demonstration, in one assertion: the stage exists
    // only because a timestamp is carried beside a status that cannot hold it.
    expect(stageFor('driver_arriving', null)).toBe('chauffeur_en_route');
    expect(stageFor('driver_arriving', ARRIVED)).toBe('arrived_at_pickup');
  });

  it('IGNORES a stale arrival timestamp on any later status', () => {
    // A ride that has moved on must never be dragged back to "outside" by an
    // overlay nobody cleared. This is the failure mode of every derived state.
    expect(stageFor('passenger_picked_up', ARRIVED)).toBe('passenger_picked_up');
    expect(stageFor('trip_started', ARRIVED)).toBe('trip_in_progress');
    expect(stageFor('completed', ARRIVED)).toBe('completed');
  });

  it('ignores an arrival timestamp on any earlier status', () => {
    expect(stageFor('confirmed', ARRIVED)).toBe('confirmed');
    expect(stageFor('driver_assigned', ARRIVED)).toBe('chauffeur_assigned');
  });

  it('places a cancelled ride nowhere on the line', () => {
    // Not stage zero, not completed — nowhere. A cancelled ride rendered on a
    // progress rail is a ride that looks like it is still happening.
    expect(stageFor('cancelled', null)).toBeNull();
    expect(stageFor('cancelled', ARRIVED)).toBeNull();
  });

  it('only allows arrival to be marked while en route', () => {
    const legal: TripStatus[] = ['driver_arriving'];
    for (const s of TRIP_STAGE_ORDER) {
      expect(canMarkArrived(s)).toBe(legal.includes(s));
    }
    expect(canMarkArrived('cancelled')).toBe(false);
  });
});

describe('the full lifecycle, as a sequence', () => {
  it('advances through all seven stages in order, never skipping or reversing', () => {
    /*
     * The sequence assertion. Each step applies exactly what the chauffeur
     * action says to apply — a status advance, or the arrival overlay — and
     * the resulting stage must be the next one in RIDE_STAGES.
     */
    let status: TripStatus = 'confirmed';
    let arrivedAt: string | null = null;
    const seen: RideStage[] = [];

    // Dispatch assigns; the chauffeur has no action before that.
    expect(chauffeurAction('confirmed')).toBeNull();
    seen.push(stageFor(status, arrivedAt) as RideStage);
    status = 'driver_assigned';

    for (let guard = 0; guard < 10; guard += 1) {
      const stage = stageFor(status, arrivedAt);
      expect(stage).not.toBeNull();
      seen.push(stage as RideStage);
      const action = chauffeurAction(stage as RideStage);
      if (!action) break;
      if (action.kind === 'arrival') {
        arrivedAt = ARRIVED;
      } else {
        const i = TRIP_STAGE_ORDER.indexOf(status);
        status = TRIP_STAGE_ORDER[i + 1] as TripStatus;
      }
    }

    expect(seen).toEqual([...RIDE_STAGES]);
  });

  it('never lets the rail go backwards', () => {
    for (let i = 0; i < RIDE_STAGES.length; i += 1) {
      const current = RIDE_STAGES[i] as RideStage;
      for (let j = 0; j < RIDE_STAGES.length; j += 1) {
        expect(hasReached(current, RIDE_STAGES[j] as RideStage)).toBe(j <= i);
      }
    }
  });

  it('gives every stage a customer headline that is not a status key', () => {
    for (const stage of RIDE_STAGES) {
      const headline = customerHeadline(stage);
      expect(headline.length).toBeGreaterThan(0);
      expect(headline).not.toMatch(/_/);
    }
    expect(customerHeadline('arrived_at_pickup')).toBe('Your chauffeur is outside');
  });

  it('marks exactly the irreversible actions for confirmation', () => {
    // Picking up and completing both end something. Being on the way does not.
    expect(chauffeurAction('chauffeur_assigned')?.confirm).toBe(false);
    expect(chauffeurAction('chauffeur_en_route')?.confirm).toBe(false);
    expect(chauffeurAction('arrived_at_pickup')?.confirm).toBe(true);
    expect(chauffeurAction('passenger_picked_up')?.confirm).toBe(false);
    expect(chauffeurAction('trip_in_progress')?.confirm).toBe(true);
  });

  it('writes the arrival overlay with no status change', () => {
    // The structural point of C-4: this action has nowhere to write a status,
    // so it writes a timestamp instead.
    expect(chauffeurAction('chauffeur_en_route')?.kind).toBe('arrival');
    for (const stage of RIDE_STAGES) {
      const a = chauffeurAction(stage);
      if (a && stage !== 'chauffeur_en_route') expect(a.kind).toBe('status');
    }
  });
});

describe('the complimentary waiting window', () => {
  const at = (isoMinutesAfter: number) => new Date(Date.parse(ARRIVED) + isoMinutesAfter * 60_000);

  it('runs 30 minutes for a standard ride and 60 for an airport ride', () => {
    expect(waitingWindow(ARRIVED, 'point_to_point', at(0))?.totalMinutes).toBe(30);
    expect(waitingWindow(ARRIVED, 'airport', at(0))?.totalMinutes).toBe(60);
  });

  it('counts down against the arrival timestamp', () => {
    const w = waitingWindow(ARRIVED, 'point_to_point', at(10));
    expect(w?.minutesRemaining).toBe(20);
    expect(w?.elapsed).toBe(false);
  });

  it('reports seconds so the display can tick without recomputing policy', () => {
    const w = waitingWindow(ARRIVED, 'point_to_point', new Date(Date.parse(ARRIVED) + 90_000));
    expect(w?.minutesRemaining).toBe(28);
    expect(w?.secondsRemaining).toBe(30);
  });

  it('floors at zero and says the window ended — without pricing anything', () => {
    const w = waitingWindow(ARRIVED, 'point_to_point', at(45));
    expect(w?.elapsed).toBe(true);
    expect(w?.minutesRemaining).toBe(0);
    const sentence = waitingSentence(w!);
    // The assertion that matters: no currency, no rate, no total. Ever.
    expect(sentence).not.toMatch(/\$|\bfee\b|\bcharge[ds]?\b|\bper minute\b|\brate\b/i);
    expect(sentence).toContain('still waiting');
  });

  it('says nothing at all when the policy has no figure', () => {
    // Same rule as servicePolicy and publishedFleet: no figure renders nothing.
    // `hourly` has no complimentary wait defined.
    const w = waitingWindow(ARRIVED, 'hourly', at(5));
    if (w !== null) expect(w.totalMinutes).toBeGreaterThan(0);
  });

  it('refuses an unparseable timestamp rather than rendering NaN', () => {
    expect(waitingWindow('not a date', 'point_to_point', at(0))).toBeNull();
  });

  it('is duration arithmetic, so it is timezone-independent', () => {
    /*
     * Stated as a test because the brief called the countdown the first thing
     * that "depends on a clock", and it is worth being exact: it depends on two
     * INSTANTS, not on a zone. The same arrival and the same now produce the
     * same remaining minutes whatever the local zone — what needs the pickup's
     * zone is rendering the arrival TIME, which lives in localeFormat.
     */
    const utc = waitingWindow('2026-08-23T19:42:00.000Z', 'point_to_point', at(10));
    const sameInstantWrittenDifferently = waitingWindow('2026-08-23T14:42:00.000-05:00', 'point_to_point', at(10));
    expect(sameInstantWrittenDifferently?.minutesRemaining).toBe(utc?.minutesRemaining);
  });
});

describe('the ETA is only rendered where it can be attributed', () => {
  /*
   * G-5: the socket carries one `etaMinutes` with no statement of which leg it
   * measures. Before pickup it coincides with the leg the customer watches —
   * luck, not correctness. After pickup there is no basis for it at all.
   *
   * Pinned as a test because the first fix gated only the headline and left the
   * progress bar drawing from the same number, which is the same claim with the
   * digits removed. One predicate, asserted over every stage.
   */
  it('allows an ETA only while the car is still approaching', () => {
    expect(etaIsAttributable('confirmed')).toBe(true);
    expect(etaIsAttributable('chauffeur_assigned')).toBe(true);
    expect(etaIsAttributable('chauffeur_en_route')).toBe(true);

    expect(etaIsAttributable('arrived_at_pickup')).toBe(false);
    expect(etaIsAttributable('passenger_picked_up')).toBe(false);
    expect(etaIsAttributable('trip_in_progress')).toBe(false);
    expect(etaIsAttributable('completed')).toBe(false);
  });

  it('shows nothing for a cancelled ride, which has no stage', () => {
    expect(etaIsAttributable(null)).toBe(false);
  });

  it('covers every stage, so a new one cannot default to showing an ETA', () => {
    // A stage added later is false until someone decides otherwise — the safe
    // direction, and the reason this is an explicit list rather than a negation.
    for (const stage of RIDE_STAGES) {
      expect(typeof etaIsAttributable(stage)).toBe('boolean');
    }
    expect(RIDE_STAGES.filter((s) => etaIsAttributable(s))).toEqual([
      'confirmed',
      'chauffeur_assigned',
      'chauffeur_en_route',
    ]);
  });
});

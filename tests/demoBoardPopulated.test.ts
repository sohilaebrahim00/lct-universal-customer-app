import { describe, expect, it } from '@jest/globals';
import { clampToLocalDay, seedBookings } from '../src/dev/demoData';
import { isSameLocalDay } from '../src/lib/localDay';

/**
 * THE DISPATCHER BOARD MUST NEVER BE EMPTY.
 *
 * It showed 0 rides, 0 unassigned, 0 late and an empty table at 21:38 the night
 * before a delivery. Nothing had thrown. Two causes compounded:
 *
 *   1. The fleet rides are seeded as offsets from NOW, and the persisted state
 *      froze those timestamps on the first visit. Opened the next day, every
 *      ride was on yesterday and the local-day filter removed all of them.
 *   2. Even freshly seeded, a +5.5h ride at 21:38 lands at 03:08 TOMORROW and
 *      falls off the board on its own.
 *
 * An operations console that is empty is indistinguishable from one that is
 * broken. These assertions run the seed at every hour of the day.
 */

/**
 * ── WHY THE MINUTE MATTERS, AND WHY THIS GRID USED TO MISS ────────────────
 *
 * The first version of these assertions swept all 24 hours at ONE minute of
 * the hour — :38 — and passed while the board was losing half its rides.
 *
 * `clampToLocalDay` had a fallback that returned `now +/- 10 minutes` without
 * re-checking the day, so it broke only within ten minutes of midnight. At
 * 23:38 the fallback lands at 23:48 and the grid saw nothing wrong. At 23:51 it
 * lands at 00:01 TOMORROW and the two future fleet rides fall off the board —
 * which is what a cold browser actually showed: 2 rides, 0 unassigned.
 *
 * A grid is only as good as its worst-covered axis. The minutes below are the
 * boundary ones, not a uniform sample: an evenly-spaced grid is exactly what
 * misses a twenty-minute defect.
 */
const HOURS_OF_DAY = Array.from({ length: 24 }, (_, h) => h);
const MINUTES_OF_INTEREST = [0, 1, 9, 10, 11, 20, 21, 29, 30, 31, 38, 49, 50, 51, 55, 58, 59];

function boardAt(hour: number, minute = 38) {
  const now = new Date(2026, 8, 1, hour, minute, 0, 0);
  const rides = seedBookings(now)
    .filter((b) => isSameLocalDay(new Date(b.scheduled_at), now))
    .filter((b) => b.status !== 'cancelled');
  return { now, rides };
}

describe('the dispatcher board is populated at every hour', () => {
  it('shows rides at all 24 hours, including late evening', () => {
    for (const hour of HOURS_OF_DAY) {
      const { rides } = boardAt(hour);
      expect(rides.length).toBeGreaterThanOrEqual(4);
    }
  });

  /*
   * The same claim, across the minute axis the hourly sweep above collapses.
   * This is the assertion that fails on the pre-fix clamp.
   */
  it('shows every fleet ride at every boundary minute of every hour', () => {
    for (const hour of HOURS_OF_DAY) {
      for (const minute of MINUTES_OF_INTEREST) {
        const { rides } = boardAt(hour, minute);
        const ids = rides.map((r) => r.id);
        const at = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        for (const id of ['demo-fleet-late', 'demo-fleet-inprogress', 'demo-fleet-unassigned', 'demo-fleet-evening']) {
          if (!ids.includes(id)) throw new Error(`${id} fell off the board at ${at}`);
        }
      }
    }
  });

  /*
   * The unassigned row is the one the assign flow needs and the one that
   * vanished first, because it is seeded furthest into the evening.
   */
  it('always offers an unassigned ride, at every boundary minute', () => {
    for (const hour of HOURS_OF_DAY) {
      for (const minute of MINUTES_OF_INTEREST) {
        const { rides } = boardAt(hour, minute);
        const at = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        if (!rides.some((r) => r.status === 'confirmed')) {
          throw new Error(`no unassigned ride on the board at ${at}`);
        }
      }
    }
  });

  it('always has one in progress, one unassigned, one later today', () => {
    for (const hour of HOURS_OF_DAY) {
      const { now, rides } = boardAt(hour);
      const ids = rides.map((r) => r.id);

      expect(ids).toContain('demo-fleet-inprogress');
      expect(ids).toContain('demo-fleet-unassigned');
      expect(ids).toContain('demo-fleet-late');
      expect(ids).toContain('demo-fleet-evening');

      // Something still ahead, so the board is not all history.
      const laterToday = rides.filter((r) => new Date(r.scheduled_at).getTime() > now.getTime());
      expect(laterToday.length).toBeGreaterThan(0);
    }
  });

  it('always has at least one ride the board should mark late', () => {
    // Past its pickup and not yet moved beyond `driver_assigned` — the rule
    // roleData's isLate() applies.
    for (const hour of HOURS_OF_DAY) {
      const { now, rides } = boardAt(hour);
      const late = rides.filter(
        (r) => new Date(r.scheduled_at).getTime() < now.getTime() && r.status === 'driver_assigned',
      );
      expect(late.length).toBeGreaterThan(0);
    }
  });

  it('always has exactly one unassigned-shaped ride for the assign flow', () => {
    for (const hour of HOURS_OF_DAY) {
      const { rides } = boardAt(hour);
      expect(rides.filter((r) => r.status === 'confirmed').length).toBeGreaterThan(0);
    }
  });
});

describe('clampToLocalDay', () => {
  it('leaves a same-day time alone', () => {
    const now = new Date(2026, 8, 1, 9, 0, 0, 0);
    const target = new Date(2026, 8, 1, 14, 0, 0, 0);
    expect(clampToLocalDay(target, now).getTime()).toBe(target.getTime());
  });

  it('pulls a next-day time back into today', () => {
    const now = new Date(2026, 8, 1, 21, 38, 0, 0);
    const target = new Date(now.getTime() + 5.5 * 3600_000); // 03:08 tomorrow
    const out = clampToLocalDay(target, now);
    expect(isSameLocalDay(out, now)).toBe(true);
    expect(out.getTime()).toBeGreaterThan(now.getTime());
  });

  it('pulls a previous-day time forward into today', () => {
    const now = new Date(2026, 8, 1, 0, 10, 0, 0);
    const target = new Date(now.getTime() - 70 * 60_000); // 23:00 yesterday
    const out = clampToLocalDay(target, now);
    expect(isSameLocalDay(out, now)).toBe(true);
    expect(out.getTime()).toBeLessThan(now.getTime());
  });

  it('never produces a future time that has already passed', () => {
    const now = new Date(2026, 8, 1, 23, 55, 0, 0);
    const target = new Date(now.getTime() + 95 * 60_000);
    const out = clampToLocalDay(target, now);
    expect(out.getTime()).toBeGreaterThan(now.getTime());
    // The property this test did NOT assert, which is how the defect survived
    // it: at 23:55 the old fallback returned 00:05 TOMORROW, which is indeed
    // later than now and is exactly the failure.
    expect(isSameLocalDay(out, now)).toBe(true);
  });

  /**
   * THE GUARANTEE, EXHAUSTIVELY — every minute of the day, both directions.
   *
   * The function has one job. Asserting it at three hand-picked times is how
   * it came to be false for twenty minutes a day, so this asserts it at all
   * 1,440.
   */
  it('keeps the result inside today at every minute of the day, in both directions', () => {
    for (let minutes = 0; minutes < 24 * 60; minutes++) {
      const now = new Date(2026, 8, 1, Math.floor(minutes / 60), minutes % 60, 0, 0);
      const at = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

      for (const offsetMin of [95, 330, -25, -70, 24 * 60, -24 * 60]) {
        const target = new Date(now.getTime() + offsetMin * 60_000);
        const out = clampToLocalDay(target, now);
        if (!isSameLocalDay(out, now)) {
          throw new Error(`clampToLocalDay left today at ${at} with offset ${offsetMin}m -> ${out.toString()}`);
        }
      }
    }
  });
});

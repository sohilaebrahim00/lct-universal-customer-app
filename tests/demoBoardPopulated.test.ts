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

const HOURS_OF_DAY = Array.from({ length: 24 }, (_, h) => h);

function boardAt(hour: number) {
  const now = new Date(2026, 8, 1, hour, 38, 0, 0);
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
    expect(clampToLocalDay(target, now).getTime()).toBeGreaterThan(now.getTime());
  });
});

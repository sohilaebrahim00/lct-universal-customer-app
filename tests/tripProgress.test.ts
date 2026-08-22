import { describe, expect, it } from '@jest/globals';
import { FINAL_FRACTION, FINAL_MINUTES, arrivingLabel, tripProgress } from '../src/lib/tripProgress';

describe('tripProgress — the dynamic display curve', () => {
  it('is empty at the start and full on arrival', () => {
    expect(tripProgress(20, 20)).toBe(0);
    expect(tripProgress(0, 20)).toBe(1);
  });

  it('puts the hinge exactly where Uber does: 2 minutes left is 80% of the bar', () => {
    // The one number the whole curve is built around.
    expect(tripProgress(FINAL_MINUTES, 20)).toBeCloseTo(1 - FINAL_FRACTION, 6);
    expect(tripProgress(FINAL_MINUTES, 45)).toBeCloseTo(0.8, 6);
    expect(tripProgress(FINAL_MINUTES, 5)).toBeCloseTo(0.8, 6);
  });

  it('gives the last two minutes a fifth of the bar to themselves', () => {
    expect(tripProgress(1, 20)).toBeCloseTo(0.9, 6);
    expect(tripProgress(0.5, 20)).toBeCloseTo(0.95, 6);
  });

  it('moves the bar faster per minute late than early — the point of the curve', () => {
    const total = 20;
    // A minute early on: 18 minutes of trip share 80% of the bar.
    const earlyRate = (tripProgress(17, total)! - tripProgress(18, total)!) / 1;
    // A minute at the end: 2 minutes share 20%.
    const lateRate = (tripProgress(1, total)! - tripProgress(2, total)!) / 1;

    expect(earlyRate).toBeCloseTo(0.8 / 18, 6);
    expect(lateRate).toBeCloseTo(0.1, 6);
    expect(lateRate).toBeGreaterThan(earlyRate * 2);
  });

  it('never goes backwards as the ETA counts down', () => {
    const total = 30;
    let previous = -1;
    // Half-minute steps, so the hinge is crossed rather than stepped over.
    for (let eta = total; eta >= 0; eta -= 0.5) {
      const p = tripProgress(eta, total)!;
      expect(p).toBeGreaterThanOrEqual(previous);
      previous = p;
    }
    expect(previous).toBe(1);
  });

  it('is continuous across the hinge', () => {
    // A visible jump at the 2-minute mark would read as a glitch, not a curve.
    const justBefore = tripProgress(2.01, 20)!;
    const justAfter = tripProgress(1.99, 20)!;
    expect(Math.abs(justAfter - justBefore)).toBeLessThan(0.01);
  });

  it('draws a very short trip entirely on the stretched segment', () => {
    // A 2-minute journey has no early segment at all.
    expect(tripProgress(2, 2)).toBe(0);
    expect(tripProgress(1, 2)).toBeCloseTo(0.5, 6);
    expect(tripProgress(0, 2)).toBe(1);
  });

  it('treats an overdue car as arrived rather than showing negative progress', () => {
    expect(tripProgress(-3, 20)).toBe(1);
  });

  it('renders nothing rather than a wrong bar when the inputs are unusable', () => {
    expect(tripProgress(null, 20)).toBeNull();
    expect(tripProgress(5, null)).toBeNull();
    expect(tripProgress(5, 0)).toBeNull();
    expect(tripProgress(5, -1)).toBeNull();
    expect(tripProgress(Number.NaN, 20)).toBeNull();
    expect(tripProgress(5, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('arrivingLabel', () => {
  it('counts down in whole minutes', () => {
    expect(arrivingLabel(6)).toBe('Arriving in 6 min');
    expect(arrivingLabel(1)).toBe('Arriving in 1 min');
  });

  it('says "now" rather than "0 min"', () => {
    // "Arriving in 0 min" to someone looking at an empty kerb is not true yet.
    expect(arrivingLabel(0)).toBe('Arriving now');
    expect(arrivingLabel(0.4)).toBe('Arriving now');
    expect(arrivingLabel(-2)).toBe('Arriving now');
  });

  it('renders nothing without an ETA', () => {
    expect(arrivingLabel(null)).toBeNull();
    expect(arrivingLabel(Number.NaN)).toBeNull();
  });
});

import { describe, expect, it } from '@jest/globals';
import {
  bearingBetween,
  distanceMiles,
  interpolateBearing,
  interpolateLatLng,
  isImplausibleJump,
  normaliseBearing,
  regionContaining,
} from '../src/lib/geo';

const MAPLE = { latitude: 32.8121, longitude: -96.8175 }; // 4820 Maple Ave, Dallas
const DFW = { latitude: 32.8969, longitude: -97.0381 }; // DFW Terminal D

describe('bearingBetween', () => {
  it('reads compass degrees, with north at 0 and east at 90', () => {
    expect(bearingBetween({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(0, 4);
    expect(bearingBetween({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(90, 4);
    expect(bearingBetween({ latitude: 0, longitude: 0 }, { latitude: -1, longitude: 0 })).toBeCloseTo(180, 4);
    expect(bearingBetween({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: -1 })).toBeCloseTo(270, 4);
  });

  it('gives north-west for the real Maple Ave → DFW leg', () => {
    const b = bearingBetween(MAPLE, DFW)!;
    expect(b).toBeGreaterThan(290);
    expect(b).toBeLessThan(320);
  });

  it('returns null for a stationary vehicle rather than inventing a direction', () => {
    // A car at a light would otherwise spin on every jittery ping.
    expect(bearingBetween(MAPLE, { ...MAPLE })).toBeNull();
  });
});

describe('interpolateBearing — the short way around', () => {
  it('crosses north without spinning the marker most of the way round', () => {
    // 350° → 10° is a 20° turn right, not a 340° turn left.
    expect(interpolateBearing(350, 10, 0.5)).toBeCloseTo(0, 4);
    expect(interpolateBearing(350, 10, 0.25)).toBeCloseTo(355, 4);
  });

  it('crosses north the other way too', () => {
    expect(interpolateBearing(10, 350, 0.5)).toBeCloseTo(0, 4);
  });

  it('interpolates an ordinary turn linearly', () => {
    expect(interpolateBearing(90, 180, 0.5)).toBeCloseTo(135, 4);
  });

  it('clamps t and always returns a normalised angle', () => {
    expect(interpolateBearing(90, 180, -1)).toBeCloseTo(90, 4);
    expect(interpolateBearing(90, 180, 5)).toBeCloseTo(180, 4);
    expect(normaliseBearing(-90)).toBeCloseTo(270, 4);
    expect(normaliseBearing(450)).toBeCloseTo(90, 4);
  });
});

describe('interpolateLatLng', () => {
  it('lands on each endpoint and halfway between', () => {
    expect(interpolateLatLng(MAPLE, DFW, 0)).toEqual(MAPLE);
    expect(interpolateLatLng(MAPLE, DFW, 1)).toEqual(DFW);
    const mid = interpolateLatLng(MAPLE, DFW, 0.5);
    expect(mid.latitude).toBeCloseTo((MAPLE.latitude + DFW.latitude) / 2, 8);
  });

  it('clamps out-of-range t so a late frame cannot overshoot past the target', () => {
    expect(interpolateLatLng(MAPLE, DFW, 1.6)).toEqual(DFW);
    expect(interpolateLatLng(MAPLE, DFW, -0.4)).toEqual(MAPLE);
  });
});

describe('distanceMiles', () => {
  it('matches the seeded 23.2-mile Maple Ave → DFW run to within routing slack', () => {
    // Straight-line, so it is shorter than the driven distance — but the same
    // order, which is what the camera framing depends on.
    const d = distanceMiles(MAPLE, DFW);
    expect(d).toBeGreaterThan(12);
    expect(d).toBeLessThan(16);
  });

  it('is zero for a point against itself', () => {
    expect(distanceMiles(MAPLE, { ...MAPLE })).toBeCloseTo(0, 8);
  });
});

describe('regionContaining', () => {
  it('frames both points with padding', () => {
    const r = regionContaining([MAPLE, DFW])!;
    expect(r.latitude).toBeCloseTo((MAPLE.latitude + DFW.latitude) / 2, 6);
    // Wider than the raw span, so neither marker sits on the edge.
    expect(r.longitudeDelta).toBeGreaterThan(Math.abs(DFW.longitude - MAPLE.longitude));
  });

  it('refuses to zoom to the pavement when two points nearly coincide', () => {
    // The moment the car reaches the pickup, without a floor, the map would
    // slam to maximum zoom.
    const almost = { latitude: MAPLE.latitude + 0.00001, longitude: MAPLE.longitude };
    const r = regionContaining([MAPLE, almost])!;
    expect(r.latitudeDelta).toBeGreaterThanOrEqual(0.008);
    expect(r.longitudeDelta).toBeGreaterThanOrEqual(0.008);
  });

  it('returns null for no points, so the caller keeps its current camera', () => {
    expect(regionContaining([])).toBeNull();
  });
});

describe('isImplausibleJump', () => {
  it('rejects a fix that teleports the car across the metroplex in a second', () => {
    expect(isImplausibleJump(MAPLE, DFW, 1000)).toBe(true);
  });

  it('accepts a car genuinely moving at speed', () => {
    // ~0.02 miles in 2 seconds — about 36 mph.
    const ahead = { latitude: MAPLE.latitude + 0.0003, longitude: MAPLE.longitude };
    expect(isImplausibleJump(MAPLE, ahead, 2000)).toBe(false);
  });

  it('accepts the same jump given enough time', () => {
    expect(isImplausibleJump(MAPLE, DFW, 30 * 60_000)).toBe(false);
  });

  it('does not reject on a zero or negative interval', () => {
    // Two frames in the same millisecond say nothing about speed.
    expect(isImplausibleJump(MAPLE, DFW, 0)).toBe(false);
  });
});

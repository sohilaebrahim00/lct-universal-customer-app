export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * The geometry the tracking screen needs, kept pure so it can be tested
 * without a map, a socket or a device.
 *
 * Everything here exists to serve one requirement: THE CHAUFFEUR MARKER NEVER
 * JUMPS. Location arrives as discrete frames from a WebSocket at an interval
 * nobody has specified; a marker that teleports on each frame reads as a
 * simulation, and this is the screen where the customer decides whether to
 * believe the app.
 */

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Normalises any angle to [0, 360). */
export function normaliseBearing(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Initial bearing from `a` to `b`, in compass degrees (0 = north, 90 = east).
 *
 * The standard forward-azimuth formula. Called "initial" because on a sphere
 * the bearing changes along a great circle — irrelevant at the distance between
 * two GPS pings, and worth naming so nobody later "fixes" it into something
 * slower.
 *
 * Returns null for two identical points: a stationary vehicle has no direction
 * of travel, and inventing one would spin the marker on every jittery ping
 * while the car sits at a light. The caller keeps the last known bearing.
 */
export function bearingBetween(a: LatLng, b: LatLng): number | null {
  if (a.latitude === b.latitude && a.longitude === b.longitude) return null;

  const φ1 = toRad(a.latitude);
  const φ2 = toRad(b.latitude);
  const Δλ = toRad(b.longitude - a.longitude);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return normaliseBearing(toDeg(Math.atan2(y, x)));
}

/** Great-circle distance in miles. Used to frame the camera and to reject GPS jumps. */
export function distanceMiles(a: LatLng, b: LatLng): number {
  const R = 3958.7613; // Earth's mean radius, miles
  const φ1 = toRad(a.latitude);
  const φ2 = toRad(b.latitude);
  const Δφ = toRad(b.latitude - a.latitude);
  const Δλ = toRad(b.longitude - a.longitude);

  const h = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Linear interpolation between two points. `t` is clamped to [0, 1]. */
export function interpolateLatLng(from: LatLng, to: LatLng, t: number): LatLng {
  const k = Math.min(1, Math.max(0, t));
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * k,
    longitude: from.longitude + (to.longitude - from.longitude) * k,
  };
}

/**
 * Interpolates between two bearings THE SHORT WAY AROUND.
 *
 * The whole reason this is not a lerp: going from 350° to 10° is a 20° turn to
 * the right, but naive interpolation takes the 340° route and spins the marker
 * almost all the way round. A car crossing north — which in Dallas means any
 * northbound stretch of the Tollway — would pirouette on screen every time.
 */
export function interpolateBearing(from: number, to: number, t: number): number {
  const k = Math.min(1, Math.max(0, t));
  let delta = normaliseBearing(to) - normaliseBearing(from);
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return normaliseBearing(normaliseBearing(from) + delta * k);
}

/**
 * A bounding region that contains every given point, with padding.
 *
 * Replaces the hand-rolled fixed deltas the old screen used
 * (`latitudeDelta: 0.02`), which framed a 23-mile airport run as tightly as a
 * one-mile hop and put the chauffeur off screen on the former.
 *
 * `minSpan` stops the camera from zooming to street level when two points are
 * almost coincident — the moment the car reaches the pickup, without it, the
 * map would slam to maximum zoom.
 */
export function regionContaining(points: LatLng[], paddingRatio = 0.45, minSpan = 0.008) {
  if (points.length === 0) return null;

  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(minSpan, (maxLat - minLat) * (1 + paddingRatio)),
    longitudeDelta: Math.max(minSpan, (maxLng - minLng) * (1 + paddingRatio)),
  };
}

/**
 * Rejects a location frame that cannot be real.
 *
 * A GPS fix that moves the car 40 miles between two pings is a bad fix, not a
 * fast car, and interpolating towards it drags the marker across the city for
 * the whole interval. Returns true when the jump should be ignored.
 *
 * The threshold is deliberately generous — 2 miles per second is roughly
 * 7,200 mph, so nothing legitimate trips it — because the failure mode of being
 * too strict is worse: a marker that stops following a car that really is
 * moving.
 */
export function isImplausibleJump(from: LatLng, to: LatLng, elapsedMs: number): boolean {
  if (elapsedMs <= 0) return false;
  const milesPerSecond = distanceMiles(from, to) / (elapsedMs / 1000);
  return milesPerSecond > 2;
}

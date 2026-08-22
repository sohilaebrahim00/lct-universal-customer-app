import { useEffect, useRef, useState } from 'react';
import {
  type LatLng,
  bearingBetween,
  interpolateBearing,
  interpolateLatLng,
  isImplausibleJump,
} from './geo';

/**
 * Turns discrete socket frames into continuous motion.
 *
 * ── The requirement ─────────────────────────────────────────────────────────
 * The chauffeur marker must never jump. Location arrives from the WebSocket as
 * `{ lat, lng }` at an interval nobody has specified, and a marker that
 * teleports on each frame reads as a simulation — on the one screen where the
 * customer is deciding whether to believe the app.
 *
 * So each incoming frame becomes a TARGET, and the marker walks towards it over
 * the time the next frame is expected to take.
 *
 * ── Where the interval comes from ───────────────────────────────────────────
 * It is MEASURED, not configured. The gap between the last two frames is the
 * best available estimate of the gap before the next one, so the marker's pace
 * matches whatever the driver app actually does — 1s, 5s, or irregular — with
 * no shared constant to drift out of sync. See BACKEND_FOLLOWUPS.md §9: no
 * update cadence is specified anywhere, on either side.
 *
 * Clamped either side, because the measurement is only a guess: too short and
 * the marker still snaps; too long and it lags visibly behind a car that has
 * already turned.
 *
 * ── Why bearing is derived here ─────────────────────────────────────────────
 * The trip socket carries no heading. `driver_locations` has a `heading` column
 * and `PATCH /drivers/me/location` accepts one, but that flows to the ADMIN
 * fleet channel, not to the customer's trip channel — so the direction the
 * marker points is computed from consecutive coordinates. That is a real
 * limitation with real consequences at low speed, recorded in §9 rather than
 * hidden behind a smooth-looking marker.
 */

const MIN_INTERVAL_MS = 900;
const MAX_INTERVAL_MS = 8000;
const DEFAULT_INTERVAL_MS = 3000;
/** ~30fps. Higher costs battery on a screen that may be open for half an hour. */
const FRAME_MS = 33;

export interface SmoothedLocation {
  /** Where to draw the marker right now. Null until the first frame arrives. */
  position: LatLng | null;
  /** Compass degrees. Holds its last value while the vehicle is stationary. */
  bearing: number;
  /** True once at least one frame has been received. */
  hasFix: boolean;
}

export function useSmoothedLocation(incoming: LatLng | null, enabled = true): SmoothedLocation {
  const [rendered, setRendered] = useState<SmoothedLocation>({ position: null, bearing: 0, hasFix: false });

  /** Where the walk started, where it is going, and when it began. */
  const from = useRef<LatLng | null>(null);
  const to = useRef<LatLng | null>(null);
  const startedAt = useRef(0);
  const durationMs = useRef(DEFAULT_INTERVAL_MS);

  const fromBearing = useRef(0);
  const toBearing = useRef(0);

  const lastFrameAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- a new target arrives ---- */
  useEffect(() => {
    if (!incoming || !enabled) return;

    const now = Date.now();
    const previous = to.current;

    if (!previous) {
      // First fix: place the marker, do not animate to it from nowhere.
      from.current = incoming;
      to.current = incoming;
      startedAt.current = now;
      lastFrameAt.current = now;
      setRendered({ position: incoming, bearing: 0, hasFix: true });
      return;
    }

    const elapsed = now - lastFrameAt.current;

    // A bad fix is not a fast car. Ignore it and keep walking to the old target.
    if (isImplausibleJump(previous, incoming, elapsed)) {
      lastFrameAt.current = now;
      return;
    }

    // Start the next leg from wherever the marker actually is, not from the
    // previous target — otherwise an early frame snaps it backwards.
    from.current = rendered.position ?? previous;
    to.current = incoming;
    startedAt.current = now;
    durationMs.current = Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, elapsed || DEFAULT_INTERVAL_MS));
    lastFrameAt.current = now;

    const next = bearingBetween(previous, incoming);
    fromBearing.current = rendered.bearing;
    // Null means it did not move: keep pointing where it was pointing.
    toBearing.current = next ?? rendered.bearing;
    // `rendered` is deliberately out of the dependency list — it changes on
    // every animation frame, and including it would restart the leg 30 times a
    // second. The refs above carry what this effect needs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming, enabled]);

  /* ---- the walk ---- */
  useEffect(() => {
    if (!enabled) return;

    timer.current = setInterval(() => {
      const target = to.current;
      const origin = from.current;
      if (!target || !origin) return;

      const t = durationMs.current <= 0 ? 1 : (Date.now() - startedAt.current) / durationMs.current;

      setRendered((current) => {
        // Settled on the target — stop recomputing until the next frame.
        if (t >= 1 && current.position && current.position.latitude === target.latitude && current.position.longitude === target.longitude) {
          return current;
        }
        return {
          position: interpolateLatLng(origin, target, t),
          bearing: interpolateBearing(fromBearing.current, toBearing.current, t),
          hasFix: true,
        };
      });
    }, FRAME_MS);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [enabled]);

  return rendered;
}

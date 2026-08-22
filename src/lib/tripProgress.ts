/**
 * TRIP PROGRESS — a dynamic display curve, not a linear one.
 *
 * ── The problem with a linear bar ───────────────────────────────────────────
 * Map ETA linearly onto a progress bar and the last two minutes — the only two
 * minutes the customer is actually watching, standing by a door with a bag —
 * move it by a few pixels. The bar stops reading as information and starts
 * reading as a spinner, and the customer switches to staring at the map dot
 * instead, which is the behaviour this screen exists to make unnecessary.
 *
 * ── Uber's approach, which is directly copyable ─────────────────────────────
 * Uber's trip progress uses a dynamic display curve: **the last 20% of the bar
 * represents the last 2 minutes.** Progress is compressed early and stretched
 * late, so the final approach feels granular rather than stalled.
 *
 * Expressed as remaining time rather than elapsed, that is a two-segment curve:
 *
 *   remaining = total ............ progress 0
 *   remaining = FINAL_MINUTES .... progress 0.8      ← the hinge
 *   remaining = 0 ................ progress 1
 *
 * The first segment covers `total - 2` minutes in 80% of the bar; the second
 * covers 2 minutes in the remaining 20%. On a 20-minute run the bar moves
 * 4.4%/min for eighteen minutes and 10%/min for the last two — it visibly
 * accelerates as the car closes, which is exactly the feel being copied.
 *
 * ── Why it is honest ────────────────────────────────────────────────────────
 * A progress bar is a display of a real quantity, and this one stays monotonic
 * and truthful about the two things that matter: it reaches 1 exactly when the
 * ETA reaches 0, and it never goes backwards unless the ETA genuinely does. It
 * reallocates *bar* between time intervals; it does not invent progress. That
 * is a different thing from a fake progress bar, and the distinction is the
 * whole justification for shipping it.
 */

/** The window the final 20% of the bar represents. Uber's published figure. */
export const FINAL_MINUTES = 2;
/** How much of the bar that window occupies. */
export const FINAL_FRACTION = 0.2;

/**
 * Display progress in [0, 1] from the ETA and the total expected duration.
 *
 * `totalMinutes` is the ETA captured when tracking began — the denominator the
 * curve is drawn against. It must be held steady by the caller: recomputing it
 * from the current ETA every tick would pin progress to a constant and the bar
 * would never move.
 *
 * Returns null when there is nothing honest to draw — no ETA at all, or a
 * nonsensical total. A null renders no bar, on the same rule as everywhere
 * else in this app: no figure beats a figure that might be wrong.
 */
export function tripProgress(etaMinutes: number | null, totalMinutes: number | null): number | null {
  if (etaMinutes === null || totalMinutes === null) return null;
  if (!Number.isFinite(etaMinutes) || !Number.isFinite(totalMinutes)) return null;
  if (totalMinutes <= 0) return null;

  const remaining = Math.max(0, etaMinutes);

  // Arrived, or past the estimate. Full bar — the car is here.
  if (remaining <= 0) return 1;

  /*
   * A journey shorter than the final window has no early segment at all, so
   * the whole thing is drawn on the stretched curve. Without this branch the
   * hinge sits beyond the start of the trip and the arithmetic inverts.
   */
  if (totalMinutes <= FINAL_MINUTES) {
    return clamp01(1 - remaining / totalMinutes);
  }

  if (remaining <= FINAL_MINUTES) {
    // The last two minutes, spread across the final 20%.
    return clamp01(1 - (remaining / FINAL_MINUTES) * FINAL_FRACTION);
  }

  // Everything before that, compressed into the first 80%.
  const earlySpan = totalMinutes - FINAL_MINUTES;
  const elapsedInEarly = totalMinutes - remaining;
  return clamp01((elapsedInEarly / earlySpan) * (1 - FINAL_FRACTION));
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/**
 * "Arriving in 6 min" / "Arriving now".
 *
 * Under a minute it says "now" rather than "0 min", because a customer reading
 * "arriving in 0 min" while looking at an empty kerb is being told something
 * that is not true yet. Null when there is no ETA — the sheet then shows the
 * status alone rather than an empty slot.
 */
export function arrivingLabel(etaMinutes: number | null): string | null {
  if (etaMinutes === null || !Number.isFinite(etaMinutes)) return null;
  if (etaMinutes <= 0) return 'Arriving now';
  if (etaMinutes < 1) return 'Arriving now';
  const rounded = Math.round(etaMinutes);
  return `Arriving in ${rounded} min`;
}

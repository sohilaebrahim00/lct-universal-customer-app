/**
 * WHAT LCT PUBLISHES ABOUT ITS OWN FLEET.
 *
 * Starting prices and quote-only status, transcribed verbatim from the
 * company's public website. These are FACTS ABOUT THE BUSINESS — the same
 * category as `servicePolicy.ts` and `reputation.ts` — and they belong here,
 * in every build, rather than in the demo dataset.
 *
 * ── Why this file exists, which is a defect worth remembering ───────────────
 * Both of these values used to live in `src/dev/demoData.ts`, reached through
 * `publishedRateFor()` and `isQuoteOnly()`, and both helpers began with
 * `if (!isDemoMode) return null/false`. The reasoning at the time was that a
 * real build should defer to the live API.
 *
 * Pointing a non-demo build at a real backend showed what that actually did:
 *
 *   Fleet advertised "From $65.00" — the backend's `base_rate`, formatted with
 *   cents. The same Executive Sedan could not be booked below $102.60 for a
 *   real journey, the theoretical floor including gratuity and tax is $83.38,
 *   and the company itself publishes $95. Three numbers, none of them each
 *   other, and the app was printing a fourth.
 *
 *   Sprinter Van showed "$211.61 ALL-IN" and Coach "$532.24", for two classes
 *   the website marks "Request Quote". The app was committing LCT to a price
 *   they have explicitly said they do not give.
 *
 * In both cases the safeguard protected the DEMO and not the product. A
 * guard gated on `isDemoMode` is inert exactly where it matters.
 *
 * ── This does NOT reconcile the price conflict ──────────────────────────────
 * The website and the backend still disagree, materially, and that stays open
 * in BACKEND_FOLLOWUPS.md §6. Nothing here decides which is correct. The only
 * change is that the app stops publishing a THIRD number that agrees with
 * neither of them.
 *
 * ── Source and date ─────────────────────────────────────────────────────────
 * Transcribed from `VERIFIED_LIVE_VEHICLE_CLASSES` in the LCT Universal website
 * source (`lct_migrate/src/lib/site-data.ts`), read on 2026-08-22. Labels are
 * unchanged — not reformatted, not recalculated, and no per-mile rate has been
 * derived backwards from them. Re-read before a launch, or expose them from the
 * backend and delete this file.
 */

export const PUBLISHED_FLEET_SOURCE = {
  source: 'LCT Universal website — VERIFIED_LIVE_VEHICLE_CLASSES',
  /** ISO date the labels were read. */
  readOn: '2026-08-22',
} as const;

/**
 * Backend `vehicle_type` → the website's published starting label, verbatim.
 *
 * A class absent from this map has NO published figure, and the app shows
 * nothing for it. It never falls back to `base_rate`: a base rate is a
 * component of a fare, not a price anyone can pay, and printing it as "From
 * $65.00" contradicts the company's own website on the browse screen.
 */
export const PUBLISHED_STARTING_LABELS: Readonly<Record<string, string>> = {
  executive_sedan: 'From $95',
  suv: 'From $110',
  sprinter: 'Request Quote',
  coach: 'Request Quote',
};

/**
 * Classes the website will not price without being asked.
 *
 * The app must NOT produce a number for these. Quoting a fixed price for a
 * vehicle the business has said it will not price commits LCT to a promise it
 * never made — the same failure as an invented cancellation window.
 *
 * Ungated, deliberately. This is what the business publishes; it is not a
 * property of the demo, and the live API carries no `quote_only` flag to defer
 * to. If one is ever added, this constant is the single place that reads it.
 */
export const QUOTE_ONLY_VEHICLE_TYPES: readonly string[] = ['sprinter', 'coach'];

/**
 * The published starting label for a class, or null when none is published.
 *
 * Null renders NOTHING — no dash, no placeholder, no computed substitute. Same
 * rule as `servicePolicy`.
 */
export function publishedStartingLabel(vehicleType: string): string | null {
  return PUBLISHED_STARTING_LABELS[vehicleType] ?? null;
}

export function isQuoteOnly(vehicleType: string): boolean {
  return QUOTE_ONLY_VEHICLE_TYPES.includes(vehicleType);
}

/**
 * Website classes with no backend equivalent, recorded so the gap is not lost.
 * Not rendered anywhere — this is documentation that happens to be typed.
 */
export const WEBSITE_CLASSES_WITHOUT_BACKEND_EQUIVALENT = [
  { name: 'Luxury SUV', priceLabel: 'From $130' },
  { name: 'First Class Sedan', priceLabel: '$150/hour' },
] as const;

import type { VehicleType } from '../types/api';

// Real LCT Universal fleet photography, copied from the website's asset
// library (LCT-Universal-Vite-Ready-v2/public/assets) — not stock/placeholder
// images. Metro requires static string literals for require(), so this is a
// literal map rather than a computed path.
export const VEHICLE_IMAGES: Record<string, number> = {
  executive_sedan: require('../../assets/vehicles/executive-sedan.jpg'),
  suv: require('../../assets/vehicles/luxury-suv.jpg'),
  sprinter: require('../../assets/vehicles/sprinter.jpg'),
  coach: require('../../assets/vehicles/coach.jpg'),
};

/**
 * ── `suv` WAS "Luxury SUV". CHANGED 2026-08-28, AND REVERSIBLE IN ONE LINE ──
 *
 * **The old label was wrong under either of the site's own namings.** Read from
 * primary source on 2026-08-26, both `lctuniversal.com/fleet` and
 * `lctuniversal.com/rates` reserve the name **Luxury SUV** for the **$130**
 * class. The app's `suv` class is published at **From $110** — a different
 * class — and was carrying the more expensive one's name.
 *
 * Leaving a known-wrong customer-facing label in production is itself a
 * decision, and the worse one. Moving to a name the site publishes is strictly
 * an improvement.
 *
 * ── Which of two published names, and why this one ─────────────────────────
 * The two pages disagree. For the $110 class:
 *
 *   `lctuniversal.com/fleet`   read 2026-08-26   **Executive SUV**   ← chosen
 *   `lctuniversal.com/rates`   read 2026-08-26   SUV
 *
 * `/fleet` is the catalogue — the page whose job is naming the classes.
 * `/rates` is a pricing page that happens to list them.
 *
 * **It also makes the app internally consistent.** `DEMO_VEHICLES` already
 * carries the literal string `'Executive SUV'` as the vehicle's `name`, so the
 * home screen, the booking picker, `PricingPreview` and `TrackingSheet` have
 * been showing that all along while Fleet and Corporate showed "Luxury SUV".
 * One class, two names, in one app. That is now one name.
 *
 * ── What did NOT change ────────────────────────────────────────────────────
 * The price. `PUBLISHED_STARTING_LABELS.suv` is still `From $110`, which is
 * what both pages publish for this class.
 *
 * ── Still open ─────────────────────────────────────────────────────────────
 * Which of the two published names the business wants — `OPEN_QUESTIONS.md` 2.
 * The question is now "which of these two", not "is the current one right".
 */
export const VEHICLE_DISPLAY_NAME: Record<VehicleType, string> = {
  executive_sedan: 'Executive Sedan',
  suv: 'Executive SUV',
  sprinter: 'Mercedes Sprinter',
  coach: 'Coach',
};

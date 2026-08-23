/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  OBSERVED. NOT CONFIRMED. NOT PUBLISHED POLICY. NOT RENDERABLE TO A CUSTOMER.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * WHAT THIS IS, EXACTLY
 * Five vehicle classes and their metered rate cards, **read off a phone
 * recording of a laptop screen showing the client's operations panel** at
 * `lctuniversal.us/admin` → Class Builder. That is the entire provenance.
 * Transcribed 2026-08-23.
 *
 * WHAT THIS IS NOT
 *   - Not confirmed by the business. Nobody has said these are the prices.
 *   - Not published policy. The company's public site says something else.
 *   - Not a customer-facing figure, in any form, derived or otherwise.
 *   - Not reconciled with `publishedFleet.ts`, which lists a DIFFERENT NUMBER
 *     OF CLASSES with different figures. Seven-ish against five is a different
 *     product catalogue, not a rounding difference.
 *   - Not read from an API. There is no integration with that panel, and
 *     whether there is meant to be one is the first open question in
 *     `PLATFORM_RECONCILIATION.md`.
 *
 * A number read off a video of a screen is evidence that something exists. It
 * is not a fact about what a customer is charged, and the difference between
 * those two things is the difference between a working app and one that
 * overcharges somebody.
 *
 * ── Why this is a lint rule and a test, and not this comment ────────────────
 * Because this project has now been burned twice by exactly this, in exactly
 * this way, with a comment like this one already in place:
 *
 *   1. `From $65.00` rendered on the fleet browser against a published $95 —
 *      the backend's `base_rate` printed as a price, a component of a fare
 *      shown as a fare.
 *   2. A live-priced Sprinter and Coach, two classes the website marks
 *      "Request Quote" — the app committing LCT to a price they had explicitly
 *      said they do not give.
 *
 * Both were guarded. Both guards were gated on `isDemoMode`, which is inert
 * exactly where it matters. A third instance is not going to be prevented by
 * asking the next person to remember, so it is prevented structurally:
 *
 *   `eslint.config.js`                          forbids importing this file
 *                                               from anything that is not the
 *                                               demo/preview layer.
 *   `tests/observedRateCardContainment.test.ts` asserts the same thing against
 *                                               the source tree, including
 *                                               `require()` and dynamic import,
 *                                               which the lint rule does not
 *                                               see.
 *
 * If you need one of these numbers in a customer-facing screen, that is not a
 * lint problem to work around. It means the business has confirmed the values,
 * and the confirmed values belong in a file that names *them* as the source —
 * the way `publishedFleet.ts` names `lctuniversal.com` and the date.
 *
 * ── Transcription notes ─────────────────────────────────────────────────────
 * Values are copied as displayed. Nothing is derived, rounded, unit-converted
 * or reconciled. Where the panel showed no value, the field is `null` and says
 * so — it is NOT zero. A missing bag count is unknown capacity; zero bags would
 * be a claim that the car cannot carry luggage, which is a different and
 * probably false statement.
 *
 * All five classes were marked bookable by riders in the panel. That flag is
 * recorded in `OBSERVED_MARKED_BOOKABLE` rather than as a per-card field,
 * because it is a fact about what the panel said on one day, not a property of
 * the pricing.
 */

import type { RateCard } from './rateCard';

/** Provenance, in the same shape as `PUBLISHED_FLEET_SOURCE`, so the two files can be compared. */
export const OBSERVED_RATE_CARD_SOURCE = {
  source: 'lctuniversal.us/admin → Class Builder, via a phone recording of a laptop screen',
  /** ISO date the recording was transcribed. */
  readOn: '2026-08-23',
  /** Sandbox mode, signed in as a test admin. */
  environment: 'sandbox',
  confirmedByBusiness: false,
} as const;

/**
 * The five classes, exactly as displayed.
 *
 * `classKey` is a slug invented here for indexing only — the panel showed
 * display names, not identifiers. It is deliberately NOT the app's
 * `VehicleType`: mapping these five onto the app's four is a business decision
 * that has not been made, and doing it silently in a key would hide it.
 */
export const OBSERVED_RATE_CARDS: readonly RateCard[] = [
  {
    classKey: 'observed_executive_sedan',
    displayName: 'Executive Sedan',
    tierTag: 'POPULAR',
    exampleVehicle: 'Cadillac XT6 or equivalent',
    baseFare: 35.0,
    perMile: 2.8,
    perMinute: 0.55,
    minimumFare: 85.0,
    perHour: 95.0,
    seats: 3,
    bags: 3,
    configuredEtaMinutes: 30,
  },
  {
    classKey: 'observed_premium_suv',
    displayName: 'Premium SUV',
    tierTag: null,
    exampleVehicle: 'Suburban or equivalent',
    baseFare: 55.0,
    perMile: 3.6,
    perMinute: 0.7,
    minimumFare: 95.0,
    perHour: 110.0,
    seats: 6,
    bags: 6,
    // 7 minutes against the Executive Sedan's 30, for a larger vehicle. Copied
    // as shown; the inconsistency is a question for the business (Q7), not
    // something to correct here.
    configuredEtaMinutes: 7,
  },
  {
    classKey: 'observed_luxury_suv',
    displayName: 'Luxury SUV',
    tierTag: 'VIP',
    exampleVehicle: 'Cadillac Escalade or equivalent',
    baseFare: 110.0,
    perMile: 5.2,
    perMinute: 1.1,
    minimumFare: 120.0,
    perHour: 130.0,
    seats: 6,
    bags: 6,
    configuredEtaMinutes: null,
  },
  {
    classKey: 'observed_first_class',
    displayName: 'First Class',
    tierTag: 'VIP',
    exampleVehicle: 'Mercedes S-Class or equivalent',
    baseFare: 90.0,
    perMile: 5.0,
    perMinute: 0.5,
    minimumFare: 150.0,
    perHour: 160.0,
    seats: 2,
    bags: null,
    configuredEtaMinutes: null,
  },
  {
    classKey: 'observed_large_group',
    displayName: 'Large Group Transports',
    tierTag: 'GROUP',
    exampleVehicle: 'Freightliner GM40 or equivalent',
    baseFare: 190.0,
    perMile: 5.0,
    perMinute: 1.0,
    minimumFare: 350.0,
    // The only class whose hourly rate is BELOW its minimum fare. Copied as
    // shown rather than assumed to be a transcription error.
    perHour: 190.0,
    seats: 40,
    bags: null,
    configuredEtaMinutes: null,
  },
];

/**
 * Every class above was marked bookable by riders in the panel.
 *
 * Recorded as an explicit list rather than assumed from membership, so that if
 * a later reading finds one switched off, the difference is visible in a diff
 * instead of being a class quietly missing from the array.
 */
export const OBSERVED_MARKED_BOOKABLE: readonly string[] = OBSERVED_RATE_CARDS.map((c) => c.classKey);

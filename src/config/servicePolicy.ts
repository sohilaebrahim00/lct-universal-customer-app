import type { ServiceType } from '../types/api';

/**
 * Published service policy, plus the inputs still pending.
 *
 * ── The rule for anything null ──────────────────────────────────────────────
 * A `null` value renders NOTHING. Not a dash, not an em-dash, not a greyed
 * placeholder. The row simply does not exist. A plausible-looking number in a
 * promise to a customer is a commitment the business has not made, and they
 * would be right to hold LCT to it.
 */

/**
 * Free-cancellation window in hours before pickup, BY SERVICE TYPE.
 *
 * Published policy, confirmed by the business. It is deliberately not one
 * number — the design assumed a single generic window, and that assumption was
 * wrong. An airport transfer and a wedding car have different economics and
 * different windows, and telling an airport customer "12 hours" would be as
 * wrong as inventing a figure.
 *
 *   Sedans and SUVs      free if cancelled more than 12 hours before pickup;
 *                        50% of the fare inside 12 hours; full charge inside
 *                        2 hours or on a no-show.
 *   Airport transfers    free at least 6 hours before; 50% inside 6 hours;
 *                        100% on a no-show.
 *   Hourly and events    free at least 48 hours in advance; 50% inside 48
 *                        hours; full charge same-day or on a no-show.
 *
 * Fees may be waived at the company's discretion in severe weather or a
 * verified emergency. That is a discretion, not an entitlement, so the app does
 * not state it as one.
 */
const freeCancellationHours = {
  pointToPoint: 12,
  airport: 6,
  hourlyOrEvent: 48,
} as const;

/**
 * Resolves the window for the service actually being booked, so a screen shows
 * "6 hours" on an airport transfer and "12 hours" on a point-to-point rather
 * than a generic line that is wrong for two thirds of bookings.
 */
export function freeCancellationHoursFor(serviceType: ServiceType | null): number | null {
  switch (serviceType) {
    case 'airport':
      return freeCancellationHours.airport;
    case 'hourly':
    case 'events':
      return freeCancellationHours.hourlyOrEvent;
    case 'point_to_point':
    case 'corporate':
      return freeCancellationHours.pointToPoint;
    // 'custom' is quote-routed and has no published window of its own.
    default:
      return null;
  }
}

/**
 * Which published tier band a service type falls in.
 *
 * ── ONE mapping, not two ──────────────────────────────────────────────────
 * This deliberately mirrors `freeCancellationHoursFor` case for case, because
 * the free window and the tier that begins where it ends are the SAME sentence
 * on `lctuniversal.com/cancellation-policy`. Two switches that agree today is
 * how a screen ends up saying "free until 6 hours before" above a tier taken
 * from the 12-hour band. `tests/cancelPolicy.test.ts` asserts they agree for
 * every service type rather than trusting that they look alike.
 */
export function feeTierBandFor(
  serviceType: ServiceType | null,
): keyof Pick<typeof CANCELLATION_FEE_TIERS_PUBLISHED, 'sedansAndSuvs' | 'airport' | 'hourlyAndEvents'> | null {
  switch (serviceType) {
    case 'airport':
      return 'airport';
    case 'hourly':
    case 'events':
      return 'hourlyAndEvents';
    case 'point_to_point':
    case 'corporate':
      return 'sedansAndSuvs';
    // 'custom' is quote-routed and has no published tier of its own.
    default:
      return null;
  }
}

/**
 * What the business publishes about cancelling INSIDE the free window.
 *
 * ── Why this is rendered now, when it was withheld before ─────────────────
 * It was held back on the reasoning that "putting a charge on a screen is a
 * commitment nobody has made". That reasoning does not survive the file it was
 * written in. These are the client's OWN figures, from their own public policy
 * page, read and dated like every other line here — and the app has been
 * printing "free until 12 hours before pickup" from the same paragraph for
 * weeks. Repeating what the customer could read on the website is not the app
 * asserting a charge; withholding it means the app knows less than the website.
 *
 * The genuinely open question was never the figure. It is the WAIVER — who may
 * waive a fee and on what grounds — which is an operator question
 * (`OPEN_QUESTIONS.md` 14c), not a customer screen.
 *
 * The weather sentence is deliberately NOT returned here: "may be waived at the
 * company's discretion" is a discretion, and rendering it beside a confirm
 * button would read as an entitlement.
 */
export function cancellationTiersFor(serviceType: ServiceType | null): readonly string[] | null {
  const band = feeTierBandFor(serviceType);
  return band === null ? null : CANCELLATION_FEE_TIERS_PUBLISHED[band];
}

/** "12 hours" / "1 hour" — so no caller has to remember the plural. */
export function cancellationSentenceFor(serviceType: ServiceType | null): string | null {
  const hours = freeCancellationHoursFor(serviceType);
  if (hours === null) return null;
  return `Free cancellation until ${hours} ${hours === 1 ? 'hour' : 'hours'} before pickup.`;
}

/**
 * The complimentary wait for the service actually being booked.
 *
 * Airport transfers get the longer window; everything else gets the standard
 * one. Same shape as `freeCancellationHoursFor` — resolved per service rather
 * than stated generically, because telling an airport customer "30 minutes"
 * would be wrong by half.
 */
export function complimentaryWaitMinutesFor(serviceType: ServiceType | null): number | null {
  if (serviceType === 'airport') return servicePolicy.complimentaryWaitMinutes.airport;
  // 'custom' is quote-routed and has no published window of its own.
  if (serviceType === null || serviceType === 'custom') return null;
  return servicePolicy.complimentaryWaitMinutes.standard;
}

/** "60 minutes of complimentary wait time are included." Null renders nothing. */
export function complimentaryWaitSentenceFor(serviceType: ServiceType | null): string | null {
  const minutes = complimentaryWaitMinutesFor(serviceType);
  if (minutes === null) return null;
  return `${minutes} minutes of complimentary wait time are included.`;
}

export const servicePolicy = {
  freeCancellationHours,

  /**
   * Changes inside this many hours of pickup may be subject to availability and
   * additional fees. Surfaced on the trip screen's Modify affordance, so a
   * client is told BEFORE they try rather than after.
   */
  modificationCutoffHours: 6,

  /**
   * The 24/7 concierge line, as published on the website. Used by the failed
   * state's "Call dispatch" action — because a customer with a car arriving in
   * twenty minutes needs a human, not a retry button.
   */
  dispatchPhone: '+1 (888) 615-4065' as string | null,

  /**
   * Complimentary wait time included in the fare, in minutes.
   *
   * Confirmed by the business. The airport figure is double the standard one
   * for the obvious reason: a delayed bag or a slow immigration queue is not
   * something a passenger controls, and a chauffeur service that starts
   * charging at the carousel is not one.
   *
   * ── This is DISPLAYABLE, not ENFORCEABLE ────────────────────────────────
   * The app can now STATE the policy, because it is real. It cannot BILL
   * against it, because nothing marks the moment the clock starts: there is no
   * "arrived at pickup" status in the trip enum, so `bookings.waiting_minutes`
   * and `waiting_fare` — which exist, from migration 0015 — can never be
   * filled correctly.
   *
   * So the business has a waiting policy it cannot charge for. That is now the
   * strongest argument for gap C-4 in BACKEND_FOLLOWUPS.md, and it is recorded
   * there rather than left as an inconsistency for someone to trip over.
   */
  complimentaryWaitMinutes: {
    standard: 30 as number | null,
    airport: 60 as number | null,
  },

  /**
   * Whether dispatch can service an immediate request. Not confirmed, so the
   * client still enforces a one-hour minimum lead time and no "Now" affordance
   * ships. "In 60 min" is the first time chip, which is correct either way.
   */
  onDemandEnabled: false,
} as const;

/**
 * The company's own words for the fare-transparency statement, and the thesis
 * of this whole redesign in five words. Used verbatim.
 */
export const PRICING_STATEMENT = 'Priced at the moment you book.';

/**
 * ── CONFIRMED AGAINST PRIMARY SOURCE, 2026-08-26 ───────────────────────────
 *
 * `lctuniversal.com/cancellation-policy`, read directly. **Every cancellation
 * figure above matches the site and nothing was edited.**
 *
 *   Sedans & SUVs         more than 12 hours — full refund   → matches 12
 *   Airport transfers     at least 6 hours to avoid charges  → matches 6
 *   Hourly & events       at least 48 hours — full refund    → matches 48
 *   Modifications         less than 6 hours may incur fees   → matches 6
 *
 * The dispatch number matches too: +1 (888) 615-4065.
 *
 * ── The fee tiers ARE stated now, and were withheld before ────────────────
 * They were held back on the reasoning that "putting a charge on a screen is a
 * commitment nobody has made". That reasoning does not survive this file: they
 * are the CLIENT's figures, from the client's own policy page, with a source
 * and a read date, in the same paragraph as the free windows this app has
 * printed for weeks. Withholding them made the app know less than the website.
 *
 * `cancellationTiersFor()` resolves them per service type and `CancelConfirm`
 * renders them once the free window has passed. What the app still refuses is
 * a CHARGE: no currency amount, no percentage applied to a booking's fare.
 * Policy, never a bill.
 *
 * The WAIVER below stays unrendered — a discretion beside a confirm button
 * reads as an entitlement. See `OPEN_QUESTIONS.md` 14c.
 *
 * ── The waiting policy is NOT stated on the site ───────────────────────────
 * The FAQ says only "We accommodate reasonable delays without additional
 * charge" for delayed flights. No minutes anywhere. So the 30/60 figures above
 * remain business-confirmed rather than site-published, and the site does not
 * contradict them.
 */
export const CANCELLATION_FEE_TIERS_PUBLISHED = {
  source: 'lctuniversal.com/cancellation-policy',
  readOn: '2026-08-26',
  /** Rendered by `CancelConfirm` through `cancellationTiersFor()`, cited to `source`. */
  sedansAndSuvs: ['More than 12 hours before pickup — full refund', 'Within 12 hours — 50% of the fare', 'Within 2 hours or no-show — full charge'],
  airport: ['Notify at least 6 hours before pickup to avoid charges', 'Less than 6 hours — 50% of the fare', 'Airport no-show without notice — 100% of the fare'],
  hourlyAndEvents: ['At least 48 hours in advance — full refund', 'Within 48 hours — 50% of the fare', 'Same-day cancellation or no-show — full charge'],
  weather: 'In cases of severe weather or verified emergencies, fees may be waived at the company’s discretion.',
} as const;

/**
 * Answers the app previously had as open questions, now published on the site.
 * Recorded rather than rendered — each needs a design decision about where it
 * belongs, and none of them contradicts anything the app currently shows.
 */
export const SITE_ANSWERS_2026_08_26 = {
  /** FAQ: "Book any vehicle by the hour with as-directed service: same driver, multiple stops, NO METER TO WATCH." */
  hourlyIsAsDirectedNotMetered: true,
  /** FAQ + /service-areas: a uniformed chauffeur meets you curbside OR at baggage claim, by preference. No separate charge stated. */
  meetAndGreetIsAPreferenceNotAnExtra: true,
  /** FAQ: "We monitor your inbound flight and adjust pickup accordingly." */
  flightTrackingIsPublished: true,
  /** FAQ: "The total fare must be authorized before the scheduled pickup time." */
  fareAuthorisedBeforePickup: true,
  /** /service-areas: Dallas–Fort Worth Metroplex and Grapevine, with a named city list. */
  coverageIsPublished: true,
  /** Terms: wheelchair accessibility available in all vehicles on request. */
  accessibilityOnRequest: true,
  /** Terms: 18+; all reservations confirmed by a concierge; same-day subject to availability. */
  minimumAge: 18,
} as const;

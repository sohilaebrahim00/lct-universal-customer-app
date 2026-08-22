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

/** "12 hours" / "1 hour" — so no caller has to remember the plural. */
export function cancellationSentenceFor(serviceType: ServiceType | null): string | null {
  const hours = freeCancellationHoursFor(serviceType);
  if (hours === null) return null;
  return `Free cancellation until ${hours} ${hours === 1 ? 'hour' : 'hours'} before pickup.`;
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
   * STILL BLOCKED. Complimentary wait time included in the fare, in minutes.
   *
   * Searched the website source: it is not on the fleet page, the rates page,
   * the cancellation policy or the FAQ. The FAQ covers flight monitoring and
   * meet-and-greet but states no wait-time figure, and nothing else on the site
   * mentions one.
   *
   * So it stays null and its slots render nothing.
   *
   * NOTE — `app/(app)/airport.tsx` markets "Complimentary Waiting Time" without
   * a figure. That copy is LEFT AS IS, deliberately: it is the company's own
   * pre-existing marketing, and a benefit stated without a number is not a
   * fabricated number. Rewriting a client's marketing claim on our own judgement
   * would be the overreach, not the restraint.
   *
   * The right response is to ask, not edit. Two questions, both on the
   * business-inputs list in BACKEND_FOLLOWUPS.md:
   *   1. What IS the complimentary waiting time, per service type?
   *   2. Does the airport page's existing claim match it?
   */
  complimentaryWaitMinutes: {
    standard: null as number | null,
    airport: null as number | null,
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

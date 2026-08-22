import type { Booking } from '../types/api';

/**
 * THE FARE THE SERVER ACTUALLY CHARGES.
 *
 * ── Why this module exists ──────────────────────────────────────────────────
 * The customer authorises a number this app computed, and Stripe charges a
 * number the BACKEND computed: `POST /payments/intent` sends
 * `amount: Number(booking.total_fare)`. Until now nothing compared the two, and
 * nothing could — the payment screen had never read the server's figure at all.
 *
 * So the rule, and it is not negotiable: **the server is the single source of
 * truth for money. The client's figure is a preview and never the charge.**
 * `calculateFarePreview()` earns its place on the vehicle screen, where there is
 * no booking yet and a live estimate is the whole point. From the moment
 * `POST /bookings` returns, this module is the only thing that says what the
 * fare is.
 *
 * ── Why the client cannot simply compute it ─────────────────────────────────
 * Three of the lines below have no client-side equivalent and never will:
 *
 *   waiting_fare       the chauffeur's waiting time is measured after the fact
 *   extra_stops_fare   added by dispatch, not chosen in the booking flow
 *   discount_amount    resolved against the `promo_codes` table, server-side
 *
 * A preview that quietly omitted them would show a breakdown that does not add
 * up to the total being charged. Reading them off the booking is the only
 * honest option, and it is why `Booking` now declares them.
 *
 * ── Strings, deliberately ───────────────────────────────────────────────────
 * Every fare column is `numeric(10,2)` and arrives as a string. `Number()` is
 * applied once, here, rather than scattered through screens where a forgotten
 * conversion turns `"180.06" + "19.24"` into `"180.0619.24"`.
 */

export interface ServerFareLine {
  label: string;
  amount: number;
}

export interface ServerFare {
  lines: ServerFareLine[];
  total: number;
  currency: string;
}

/** `"180.06"` → `180.06`. Null, undefined and unparseable all become 0. */
function amount(value: string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Builds the itemised fare from a booking the server has priced.
 *
 * Zero-valued lines are omitted rather than shown as $0.00 — the same
 * null-driven rule the rest of this app follows. A booking with no waiting time
 * shows no waiting row, because there is nothing to explain.
 *
 * The discount is the one line rendered negative, because that is what it is.
 */
export function serverFareFrom(booking: Booking): ServerFare {
  const lines: ServerFareLine[] = [{ label: 'Base fare', amount: amount(booking.base_fare) }];

  const distanceFare = amount(booking.distance_fare);
  if (distanceFare > 0) {
    lines.push({
      label: booking.distance_miles ? `Distance · ${booking.distance_miles} mi` : 'Distance',
      amount: distanceFare,
    });
  }

  const timeFare = amount(booking.time_fare);
  if (timeFare > 0) lines.push({ label: 'Time', amount: timeFare });

  const surcharges = amount(booking.surcharges);
  if (surcharges > 0) lines.push({ label: 'Late-night surcharge', amount: surcharges });

  const waiting = amount(booking.waiting_fare);
  if (waiting > 0) lines.push({ label: 'Waiting time', amount: waiting });

  const extraStops = amount(booking.extra_stops_fare);
  if (extraStops > 0) lines.push({ label: 'Additional stops', amount: extraStops });

  const discount = amount(booking.discount_amount);
  if (discount > 0) lines.push({ label: 'Discount', amount: -discount });

  lines.push({ label: 'Gratuity · 20%', amount: amount(booking.gratuity) });
  lines.push({ label: 'Tax', amount: amount(booking.tax) });

  return {
    lines,
    total: amount(booking.total_fare),
    currency: booking.currency,
  };
}

/**
 * Whether the server's figure differs from the one the customer authorised.
 *
 * Compared in CENTS. Comparing dollars as floats would let `180.06 !== 180.06`
 * fire an interstitial over a representation artefact, and the whole value of
 * this check is that it only speaks when something real has changed.
 *
 * Any difference at all counts — there is no tolerance band. A tolerance would
 * be a decision about how much silent overcharging is acceptable, and the
 * answer to that is none.
 */
export function fareDiffers(authorised: number, server: number): boolean {
  return Math.round(authorised * 100) !== Math.round(server * 100);
}

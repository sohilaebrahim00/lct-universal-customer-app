import { addDays, format, isSameDay, isValid, parseISO } from 'date-fns';

export function formatCurrency(amount: number | string, currency = 'usd'): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(value);
}

export function formatDateTime(iso: string): string {
  const date = parseISO(iso);
  if (!isValid(date)) return iso;
  return format(date, "EEE, MMM d 'at' h:mm a");
}

/**
 * The pickup time as a person holds it in their head: "Today, 1:15 PM".
 *
 * `formatDateTime` gives "Fri, Aug 22 at 1:15 PM", which is right on a receipt
 * and wrong on a card the customer is glancing at hours before the car arrives —
 * it makes them work out which day "Fri" is. Today and tomorrow get named;
 * anything further out keeps the weekday and date, because then the date IS the
 * information.
 *
 * `now` is a parameter rather than a call to the clock so the result is
 * deterministic and testable, and so the Home screen's existing ticking `now`
 * drives the rollover from "Tomorrow" to "Today" at midnight for free.
 */
export function formatPickupWhen(iso: string, now: Date): string {
  const date = parseISO(iso);
  if (!isValid(date)) return iso;

  const time = format(date, 'h:mm a');
  if (isSameDay(date, now)) return `Today, ${time}`;
  if (isSameDay(date, addDays(now, 1))) return `Tomorrow, ${time}`;
  return `${format(date, 'EEE, MMM d')}, ${time}`;
}

/** "1:15 PM". The time alone, for a screen where the day is already established. */
export function formatTimeOfDay(date: Date): string {
  return isValid(date) ? format(date, 'h:mm a') : '';
}

export function formatDateShort(iso: string): string {
  const date = parseISO(iso);
  if (!isValid(date)) return iso;
  return format(date, 'MMM d, yyyy');
}

export function formatServiceType(serviceType: string): string {
  return serviceType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatVehicleType(vehicleType: string): string {
  return formatServiceType(vehicleType);
}

/**
 * "Arrives approximately 7:42 PM", or null.
 *
 * ── Why this is a function and not two lines on the review screen ───────────
 * The screen it feeds is `book/payment.tsx`, which is covered by
 * `tests/quoteIsNotScaled.test.ts` — the assertion that nothing between quote
 * and confirmation multiplies a fare. Keeping the minutes-to-milliseconds
 * arithmetic out of that file keeps the screen's own code free of any
 * multiplication at all, which is easier to read and easier to keep true.
 *
 * ── Precision, deliberately limited ────────────────────────────────────────
 * The duration comes from the routing service and is a live-traffic estimate
 * for the moment it was fetched, not a promise about a journey that has not
 * started. So the copy says "approximately", and the time is rendered to the
 * minute because that is the precision the source has — never to the second.
 *
 * Null when either input is missing. No figure, no line — the same rule the
 * rest of this app follows rather than showing a dash.
 */
export function formatEstimatedArrival(scheduledAt: Date | null, durationMinutes: number | null): string | null {
  if (!scheduledAt || durationMinutes === null || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return null;
  }
  const arrival = new Date(scheduledAt.getTime() + durationMinutes * 60_000);
  if (Number.isNaN(arrival.getTime())) return null;
  return formatTimeOfDay(arrival);
}

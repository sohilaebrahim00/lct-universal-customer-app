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

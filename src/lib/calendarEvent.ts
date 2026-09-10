/**
 * THE RIDE AS A CALENDAR EVENT — an .ics file, built locally, no dependency.
 *
 * ── What this replaced ────────────────────────────────────────────────────
 * `book/confirmed.tsx` rendered an "Add to calendar" button whose `onPress`
 * was an empty function with a comment explaining that `expo-calendar` was not
 * installed. A control that is present, labelled, focusable and does nothing
 * is the same defect as a status that renders as silence: the customer presses
 * it, nothing happens, and they conclude the app is broken rather than that the
 * feature is pending.
 *
 * §14 of the delivery brief names the way out — an .ics export needs no device
 * permission and no package. RFC 5545 is a text format; this builds it.
 *
 * ── Web only, deliberately ────────────────────────────────────────────────
 * A browser can be handed a blob. React Native cannot write a file without
 * `expo-file-system` and cannot open a calendar without `expo-calendar`, and
 * adding a dependency is a decision this repository asks to be raised. So the
 * button renders on web, where it genuinely works, and is absent on native
 * rather than present and inert. `HANDOFF.md` records the two packages a native
 * implementation would need.
 *
 * ── What is deliberately NOT in the file ──────────────────────────────────
 * **The fare.** A calendar entry syncs to devices, work accounts and shared
 * calendars this app does not control, and a chauffeur booking's price is not
 * something to scatter across them. The reservation code is there instead: it
 * is what dispatch needs, and it identifies the ride without pricing it.
 */

export interface RideCalendarEvent {
  /** ISO 8601 instant the car is booked for. */
  scheduledAt: string;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  /** "LCT-4F2A19" — the customer-facing reference, never the internal id. */
  reservationCode: string | null;
  vehicleName: string | null;
  /** Present only when the ride is for someone other than the account holder. */
  passengerName?: string | null;
}

/** Chauffeur bookings are scheduled, not open-ended; two hours is a sane block. */
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

/** `20260903T193000Z` — RFC 5545 UTC form. */
function stamp(d: Date): string {
  return `${d.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

/**
 * RFC 5545 §3.3.11: backslash, semicolon and comma are escaped, and newlines
 * become a literal `\n`. Skipping this is how an address with a comma silently
 * truncates a field — every address here has commas in it.
 */
function esc(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/**
 * RFC 5545 §3.1: lines are folded at 75 octets, continuations begin with a
 * space. Long Dallas addresses exceed it easily, and an unfolded line is a file
 * some calendar clients reject outright.
 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join('\r\n');
}

/** The .ics text for one ride. Pure — the tests assert against this directly. */
export function buildRideIcs(event: RideCalendarEvent, now: Date = new Date()): string {
  const start = new Date(event.scheduledAt);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MS);

  const summary = event.dropoffAddress
    ? `LCT Universal — car to ${event.dropoffAddress.split(',')[0]!.trim()}`
    : 'LCT Universal — chauffeur';

  const description = [
    event.pickupAddress ? `Pickup: ${event.pickupAddress}` : null,
    event.dropoffAddress ? `Drop-off: ${event.dropoffAddress}` : null,
    event.vehicleName ? `Class: ${event.vehicleName}` : null,
    event.passengerName ? `Passenger: ${event.passengerName}` : null,
    event.reservationCode ? `Reservation: ${event.reservationCode}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  /*
   * A UID that is stable for the ride, so re-adding updates the same entry
   * rather than duplicating it. Falls back to the start time when there is no
   * reservation code — still deterministic, still not random.
   */
  const uid = `${event.reservationCode ?? stamp(start)}@lctuniversal.com`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LCT Universal//Customer App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${esc(uid)}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(summary)}`,
    description ? `DESCRIPTION:${esc(description)}` : null,
    event.pickupAddress ? `LOCATION:${esc(event.pickupAddress)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((l): l is string => l !== null);

  // CRLF throughout — RFC 5545 requires it, and Outlook enforces it.
  return lines.map(fold).join('\r\n');
}

/**
 * A filename a person can recognise in a downloads folder.
 *
 * The reservation code already begins with `LCT-`, so prefixing it blindly gave
 * `lct-lct-bx7shc.ics` — caught by downloading a real one and reading the
 * filename, not by reading the function. The prefix is added only when the code
 * does not already carry it, which keeps a code-less ride at `lct-ride.ics`.
 */
export function icsFileName(event: RideCalendarEvent): string {
  const code = (event.reservationCode ?? 'ride').toLowerCase().replace(/[^a-z0-9-]/g, '');
  return code.startsWith('lct-') ? `${code}.ics` : `lct-${code}.ics`;
}

/**
 * Hands the browser the file. No-op off web, where there is nothing to hand it
 * to — the caller does not render the control there.
 *
 * The object URL is revoked on the next tick: revoking synchronously can beat
 * the download in some browsers, and never revoking leaks the blob for the
 * lifetime of the document.
 */
export function downloadIcs(event: RideCalendarEvent): boolean {
  if (typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') return false;
  try {
    const blob = new Blob([buildRideIcs(event)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = icsFileName(event);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  } catch {
    return false;
  }
}

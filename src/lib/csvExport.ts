import type { Booking, Profile, TripDriverInfo } from '../types/api';
import { TRIP_STATUS_LABELS } from './tripStatus';
import { formatDuration, recordedAt, type TimelineEvent } from './rideTimeline';

/**
 * CSV EXPORT — operational reporting, with the empty columns left empty.
 *
 * ── Escaping is the whole job ─────────────────────────────────────────────
 * Every address in this product contains a comma. A naive join produces a file
 * that opens in Excel with the columns silently shifted from the pickup field
 * onwards — which is worse than a failed export, because it looks like data.
 *
 * So this follows RFC 4180: a field containing a comma, a double quote or a
 * line break is wrapped in quotes, and inner quotes are doubled. CRLF line
 * endings, because that is what the spec says and what Excel expects.
 *
 * ── The BOM, and why it is worth three bytes ──────────────────────────────
 * Excel on Windows reads a UTF-8 file as the system codepage unless it finds a
 * byte-order mark, which turns "Mustapha" into mojibake for any non-ASCII name
 * or address. The mark is written first for that reason alone.
 */

/** RFC 4180: quote when the value contains a delimiter, a quote or a newline. */
export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (!/[",\r\n]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Rows to a complete document, header included, CRLF throughout, BOM first. */
export function toCsv(rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  const body = rows.map((row) => row.map(csvField).join(',')).join('\r\n');
  return `﻿${body}\r\n`;
}

/** `lct-completed-rides-2026-09-13.csv` — dated in the viewer's local day. */
export function exportFileName(kind: string, on: Date = new Date()): string {
  const y = on.getFullYear();
  const m = String(on.getMonth() + 1).padStart(2, '0');
  const d = String(on.getDate()).padStart(2, '0');
  return `lct-${kind}-${y}-${m}-${d}.csv`;
}

/**
 * ── Columns this export CANNOT fill, and why they are still here ──────────
 *
 * **Plate** — there are no physical vehicles. `vehicles` is a fare-class table
 * and `booking.vehicle_id` names the class that was bought, not the car that
 * went. A `fleet_vehicles` table is BACKEND REQUIRED.
 *
 * **Payment Status** — `Booking` has no `payment_status`, no payment intent and
 * no settled flag. The fare is stored; whether it cleared is not.
 *
 * They are kept as columns because an operator opening this in Excel needs the
 * shape to be stable, and an empty cell says "not recorded" where a removed
 * column says nothing at all. Neither is ever filled with a plausible guess.
 *
 * **Booking Reference** is the booking id. `LX-XXXXXX` appears on the client's
 * own panel but no such field exists here and none is minted — a locally
 * invented code would look exactly like theirs and match nothing in their
 * system. `OPEN_QUESTIONS.md` #7.
 */
export const COMPLETED_RIDE_COLUMNS = [
  'Booking Reference',
  'Status',
  'Scheduled Date',
  'Actual Start',
  'Actual End',
  'Duration',
  'Customer',
  'Passenger',
  'Driver',
  'Vehicle',
  'Plate',
  'Vehicle Class',
  'Pickup',
  'Dropoff',
  'Final Fare',
  'Payment Status',
] as const;

export interface CompletedRideRow {
  booking: Booking;
  customer: Profile | null;
  driver: TripDriverInfo | null;
  /** The fare CLASS name — what the customer bought. */
  vehicleName: string | null;
  events: readonly TimelineEvent[];
}

/** ISO to something a spreadsheet and a person both read the same way. */
function stamp(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '';
}

/**
 * One row per completed ride.
 *
 * ── The fare is the STORED one ────────────────────────────────────────────
 * `booking.total_fare` as charged, never recomputed. A historical ride priced
 * from today's rate card would quietly restate what a customer paid every time
 * the business changes a rate — which is exactly what happened to First Class
 * this month.
 *
 * ── Start and end come from RECORDED events only ──────────────────────────
 * `recordedAt` ignores estimated events, so a seeded ride exports blank times
 * and a blank duration rather than the placeholder clock it carries internally.
 * A spreadsheet is the last place a guess should end up: it gets filtered,
 * summed and pasted into a report, and nothing downstream can tell.
 */
export function completedRideRows(rides: readonly CompletedRideRow[]): string[][] {
  return rides.map(({ booking, customer, driver, vehicleName, events }) => {
    const start = recordedAt(events, 'trip_started');
    const end = recordedAt(events, 'completed');

    return [
      booking.id,
      TRIP_STATUS_LABELS[booking.status] ?? booking.status,
      stamp(booking.scheduled_at),
      stamp(start),
      stamp(end),
      formatDuration(start, end) ?? '',
      customer?.full_name ?? '',
      // The guest who actually travelled, where one was named. Falls back to
      // nothing rather than to the account holder — they are different people
      // and conflating them is the bug the passenger work exists to prevent.
      booking.primary_passenger_name ?? '',
      driver?.full_name ?? '',
      vehicleName ?? '',
      '', // Plate — no physical vehicle record. See the note above.
      vehicleName ?? '',
      booking.pickup_address,
      booking.dropoff_address ?? '',
      booking.total_fare,
      '', // Payment Status — no such field on Booking.
    ];
  });
}

/** The finished document for the completed-rides report. */
export function completedRidesCsv(rides: readonly CompletedRideRow[]): string {
  return toCsv([[...COMPLETED_RIDE_COLUMNS], ...completedRideRows(rides)]);
}

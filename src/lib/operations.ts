import type { Booking } from '../types/api';
import { isSameLocalDay } from './localDay';
import { recordedAt, type TimelineEvent } from './rideTimeline';

/**
 * OPERATIONAL STATE — derived from assignments and the ride lifecycle, never
 * stored beside them.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  WHY THERE IS NO VEHICLE HALF OF THIS FILE
 *
 *  `vehicles` is a FARE-CLASS table. Three rows — sedan, SUV, sprinter — one
 *  per class, with `license_plate` and `color` nullable because, in migration
 *  0022's own words, "existing seeded rows represent a fleet *class*, not a
 *  specific plated vehicle".
 *
 *  So `booking.vehicle_id` says which CLASS was booked, not which car is
 *  going. Every Executive Sedan booking in the system shares one id. Vehicle
 *  availability and vehicle double-booking cannot be computed from it: a
 *  "conflict" would fire on every pair of concurrent sedan rides, which is
 *  not a conflict, it is the business working.
 *
 *  That needs a `fleet_vehicles` table of physical cars. Until it exists,
 *  vehicle availability, vehicle conflicts and vehicle history are BACKEND
 *  REQUIRED — see `BACKEND_FOLLOWUPS.md` §1.
 * ══════════════════════════════════════════════════════════════════════════
 */

/**
 * What a driver is doing right now, derived from their assignments.
 *
 * `unavailable` is deliberately absent. `TripDriverInfo` is
 * `{ id, full_name, avatar_url, rating }` — there is no `active` flag and no
 * offline switch, so a driver being off-duty is not something this app can
 * know. Inventing the state would mean showing "Unavailable" for a reason
 * nobody recorded, or worse, "Available" for one.
 */
export type DriverAvailability =
  /** Nothing on the board blocking them. */
  | 'available'
  /** Holds a future ride that has not started moving. */
  | 'assigned'
  /** On the way to a pickup. */
  | 'en_route'
  /** Passenger aboard, or the ride is under way. */
  | 'on_trip';

export const DRIVER_AVAILABILITY_LABELS: Record<DriverAvailability, string> = {
  available: 'Available',
  assigned: 'Assigned',
  en_route: 'En route',
  on_trip: 'On trip',
};

/** The statuses that mean a driver is physically committed to a ride now. */
const EN_ROUTE_STATUSES = ['driver_arriving'] as const;
const ON_TRIP_STATUSES = ['passenger_picked_up', 'trip_started'] as const;

/** Rides that no longer occupy anybody. */
function isFinished(booking: Booking): boolean {
  return booking.status === 'completed' || booking.status === 'cancelled';
}

/**
 * A driver's current state, from the rides actually assigned to them.
 *
 * Order matters: a driver mid-ride is `on_trip` even if they also hold a later
 * booking. The most committed state wins, because that is the one that stops
 * them taking work.
 */
export function driverAvailability(driverBookings: readonly Booking[]): DriverAvailability {
  const live = driverBookings.filter((b) => !isFinished(b));
  if (live.some((b) => (ON_TRIP_STATUSES as readonly string[]).includes(b.status))) return 'on_trip';
  if (live.some((b) => (EN_ROUTE_STATUSES as readonly string[]).includes(b.status))) return 'en_route';
  if (live.length > 0) return 'assigned';
  return 'available';
}

/** Where a driver has to be next, or null. Real scheduled time, never an estimate. */
export function nextAssignment(driverBookings: readonly Booking[], now: Date = new Date()): Booking | null {
  const upcoming = driverBookings
    .filter((b) => !isFinished(b) && Date.parse(b.scheduled_at) >= now.getTime())
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at));
  return upcoming[0] ?? null;
}

/** How long a ride occupies its driver. `end` is null when nobody recorded it. */
export interface OccupiedWindow {
  start: number;
  end: number | null;
  /** Where `end` came from — or why there isn't one. */
  endSource: 'hourly' | 'recorded' | 'unknown';
}

/**
 * The window a booking takes out of a driver's day.
 *
 * ── Three cases, and only two of them have an end ─────────────────────────
 * **hourly** — the customer bought a number of hours, so the end is arithmetic
 * on a figure they agreed to. Real.
 *
 * **recorded** — the ride finished and the completion was written down, so the
 * end is history. Real. (An ESTIMATED completion is refused: `recordedAt`
 * ignores seeded events, so a placeholder cannot become a window.)
 *
 * **unknown** — a point-to-point ride that has not finished. The routed
 * duration is computed by Google Directions at booking time and **is not
 * persisted**: `Booking` carries `scheduled_at`, `distance_miles` and
 * `hourly_duration_hours`, and no trip duration at all.
 *
 * So for the third case this returns `end: null` rather than a guess. Deriving
 * minutes from miles would mean choosing an average speed — a business
 * assumption about traffic that nobody in this project has made, and one that
 * would be doing real work in a conflict check nobody could audit.
 */
export function occupiedWindow(booking: Booking, events: readonly TimelineEvent[] = []): OccupiedWindow {
  const start = Date.parse(booking.scheduled_at);

  const completedAt = recordedAt(events, 'completed');
  if (completedAt) return { start, end: Date.parse(completedAt), endSource: 'recorded' };

  if (booking.service_type === 'hourly' && booking.hourly_duration_hours) {
    return { start, end: start + booking.hourly_duration_hours * 3_600_000, endSource: 'hourly' };
  }

  return { start, end: null, endSource: 'unknown' };
}

export type ConflictSeverity =
  /** Both windows are known and they genuinely overlap. */
  | 'overlap'
  /** One window has no known end, so an overlap cannot be ruled out. */
  | 'possible';

export interface AssignmentConflict {
  bookingId: string;
  severity: ConflictSeverity;
  /** The ride already held, in ISO. `until` is null when it has no known end. */
  from: string;
  until: string | null;
  status: Booking['status'];
  pickup: string;
  dropoff: string | null;
  /** Plain sentence an operator can act on. */
  reason: string;
}

/** "2:00 PM" in the viewer's locale, for a sentence rather than a table. */
function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * Whether assigning this driver to `candidate` collides with work they hold.
 *
 * ── The conservative half is the point ────────────────────────────────────
 * Two known windows overlap on the ordinary test. Where one has NO known end,
 * this reports `possible` for any same-day ride starting at or after it —
 * because "we do not know when that ride ends" genuinely does not rule out a
 * collision, and a dispatcher deserves to be told that rather than reassured.
 *
 * **No buffer is invented.** There is no "assume 45 minutes", no padding
 * either side. The only inputs are times the system actually holds, and where
 * it holds none the answer is "cannot rule this out" instead of a number.
 *
 * Same-local-day scoping uses `isSameLocalDay`, the rule the dispatcher board
 * already runs on, so the two cannot disagree about what "today" means.
 */
export function findDriverConflicts(
  candidate: Booking,
  heldBookings: readonly Booking[],
  eventsByBooking: Readonly<Record<string, readonly TimelineEvent[]>> = {},
): AssignmentConflict[] {
  const mine = occupiedWindow(candidate, eventsByBooking[candidate.id] ?? []);
  const conflicts: AssignmentConflict[] = [];

  for (const held of heldBookings) {
    if (held.id === candidate.id) continue;
    if (isFinished(held) && held.status === 'cancelled') continue; // a cancelled ride holds nobody

    const theirs = occupiedWindow(held, eventsByBooking[held.id] ?? []);
    const from = new Date(theirs.start).toISOString();
    const until = theirs.end === null ? null : new Date(theirs.end).toISOString();

    const base = {
      bookingId: held.id,
      from,
      until,
      status: held.status,
      pickup: held.pickup_address,
      dropoff: held.dropoff_address,
    };

    // Both ends known: the ordinary half-open overlap test.
    if (mine.end !== null && theirs.end !== null) {
      if (mine.start < theirs.end && theirs.start < mine.end) {
        conflicts.push({
          ...base,
          severity: 'overlap',
          reason: `Already assigned from ${clock(theirs.start)} to ${clock(theirs.end)}.`,
        });
      }
      continue;
    }

    // One end unknown. Only same-day work can collide, and only work that has
    // not demonstrably finished before this ride starts.
    const sameDay = isSameLocalDay(new Date(theirs.start), new Date(mine.start));
    if (!sameDay) continue;

    if (theirs.end === null && theirs.start <= mine.start) {
      conflicts.push({
        ...base,
        severity: 'possible',
        reason: `Already assigned at ${clock(theirs.start)}, and that ride's duration is not recorded — an overlap cannot be ruled out.`,
      });
      continue;
    }
    if (mine.end === null && mine.start <= theirs.start) {
      conflicts.push({
        ...base,
        severity: 'possible',
        reason: `This ride's duration is not recorded, and the driver is due at ${clock(theirs.start)} — an overlap cannot be ruled out.`,
      });
    }
  }

  return conflicts;
}

/** True when anything at all should stop a dispatcher assigning without a second look. */
export function hasBlockingConflict(conflicts: readonly AssignmentConflict[]): boolean {
  return conflicts.some((c) => c.severity === 'overlap');
}

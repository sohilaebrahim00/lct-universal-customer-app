import type { Booking, Profile, TripDriverInfo } from '../../types/api';
import type { TripStatus } from '../../lib/tripStatus';
import { TRIP_STATUS_LABELS, isTerminalStatus, nextTripStage } from '../../lib/tripStatus';
import { DEMO_CHAUFFEURS, DEMO_VEHICLES, chauffeurById, customerById } from '../demoData';
import { api } from '../../lib/apiClient';

/**
 * What the chauffeur and dispatcher views read, derived from the one demo store.
 *
 * Everything here is a SELECTOR over data the client app already has. Nothing
 * in this file invents a field. Where a view wanted something the backend
 * cannot supply, the function returns null and the screen renders nothing —
 * the same null-driven rule `servicePolicy` follows — and the gap is written
 * down in BACKEND_FOLLOWUPS.md under "Role preview".
 */

export interface RoleRide {
  booking: Booking;
  customer: Profile | null;
  chauffeur: TripDriverInfo | null;
  vehicleName: string | null;
  /** Pickup has passed and the ride has not moved off "assigned" or earlier. */
  late: boolean;
}

interface RolePreviewPayload {
  bookings: Booking[];
  assignments: Record<string, string>;
}

/**
 * The whole day, from the same store the client app reads.
 *
 * Goes through `api.get` rather than importing the module's state directly, so
 * these screens sit behind the identical request boundary — and the identical
 * latency — as everything else in the demo.
 */
export async function loadRides(now: Date): Promise<RoleRide[]> {
  const { bookings, assignments } = await api.get<RolePreviewPayload>('/role-preview');
  return bookings
    .filter((b) => isSameLocalDay(new Date(b.scheduled_at), now))
    .filter((b) => b.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .map((booking) => toRide(booking, assignments[booking.id] ?? null, now));
}

export async function loadRide(bookingId: string, now: Date): Promise<RoleRide | null> {
  const { bookings, assignments } = await api.get<RolePreviewPayload>('/role-preview');
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return null;
  return toRide(booking, assignments[booking.id] ?? null, now);
}

function toRide(booking: Booking, chauffeurId: string | null, now: Date): RoleRide {
  const vehicle = DEMO_VEHICLES.find((v) => v.id === booking.vehicle_id) ?? null;
  return {
    booking,
    customer: customerById(booking.profile_id),
    chauffeur: chauffeurById(chauffeurId),
    vehicleName: vehicle?.name ?? null,
    late: isLate(booking, now),
  };
}

/**
 * "Today" in LOCAL time.
 *
 * Not a UTC day boundary: a dispatcher's day ends when their day ends. Worth
 * saying out loud because the backend has no date-scoped query at all — see the
 * gap list — so this rule currently lives only on the client.
 */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/**
 * LATE — computed, because nothing in the schema expresses it.
 *
 * A ride is late when its pickup time has passed and it has not moved beyond
 * "chauffeur assigned": the car should be at the kerb and nobody has said it is.
 * Once the status reaches `driver_arriving` or later the ride is under way and
 * lateness stops being the board's problem.
 *
 * The five-minute grace is a rendering choice, not a policy — LCT has published
 * no lateness threshold, and this preview does not invent one. It exists so a
 * ride does not turn red the instant the clock ticks over. See the gap list:
 * "late" needs an operational definition before it can mean anything.
 */
const LATE_GRACE_MS = 5 * 60_000;

export function isLate(booking: Booking, now: Date): boolean {
  if (isTerminalStatus(booking.status)) return false;
  const started = ['driver_arriving', 'passenger_picked_up', 'trip_started'] as TripStatus[];
  if (started.includes(booking.status)) return false;
  return new Date(booking.scheduled_at).getTime() + LATE_GRACE_MS < now.getTime();
}

/** The rides assigned to one chauffeur, in time order. */
export function ridesFor(rides: RoleRide[], chauffeurId: string): RoleRide[] {
  return rides.filter((r) => r.chauffeur?.id === chauffeurId);
}

/** The chauffeur whose view the preview shows. Fixed — this is not a login. */
export const PREVIEW_CHAUFFEUR = DEMO_CHAUFFEURS[0]!;

export const ALL_CHAUFFEURS = DEMO_CHAUFFEURS;

/* ------------------------------------------------------------------ *
 * The one derived field, and why it is derived rather than invented.
 * ------------------------------------------------------------------ */

/**
 * The text for the name sign held at arrivals.
 *
 * There is NO `name_sign_text` column. `bookings.primary_passenger_name` exists
 * and is nullable, so this derives the sign from the name the chauffeur is
 * actually meeting: the named passenger if the booking has one, otherwise the
 * account holder. That is exactly what a chauffeur does today with the data
 * they are given — it is a rendering of a real field, not a new fact.
 *
 * It is also not good enough, which is the point of showing it. A client who
 * wants the board to read their COMPANY name, or a different name to the
 * booker's, or a name in a script the booking form does not accept, cannot say
 * so anywhere. Returns null when there is no name at all, and the screen then
 * renders no sign rather than an empty one. Recorded as gap C-1.
 */
export function nameSignText(ride: RoleRide): string | null {
  const name = ride.booking.primary_passenger_name ?? ride.customer?.full_name ?? null;
  return name ? name.toUpperCase() : null;
}

/**
 * The phone the chauffeur would call.
 *
 * `bookings.primary_passenger_phone` first — the person at the kerb — falling
 * back to the account holder's `profiles.phone`. Both are real columns. Null
 * when neither is set, and the call action then does not render.
 */
export function contactPhone(ride: RoleRide): string | null {
  return ride.booking.primary_passenger_phone ?? ride.customer?.phone ?? null;
}

export function contactName(ride: RoleRide): string | null {
  return ride.booking.primary_passenger_name ?? ride.customer?.full_name ?? null;
}

/* ------------------------------------------------------------------ *
 * Status, in the chauffeur's words.
 * ------------------------------------------------------------------ */

/**
 * What the single button on the status screen says.
 *
 * The client-facing labels in `TRIP_STATUS_LABELS` describe a state to someone
 * waiting ("Chauffeur Arriving"). A chauffeur needs an ACTION, in their own
 * voice, for the thing they are about to do.
 *
 * The keys are the backend's, unchanged. Note what is missing: there is no
 * "arrived at pickup" status in the enum, so a chauffeur cannot tell anyone the
 * car is at the kerb — the biggest single gap this preview found. Gap C-4.
 */
const CHAUFFEUR_ACTION_LABELS: Partial<Record<TripStatus, string>> = {
  driver_arriving: 'On the way',
  passenger_picked_up: 'Passenger on board',
  trip_started: 'Trip started',
  completed: 'Dropped off',
};

export interface NextStep {
  status: TripStatus;
  label: string;
}

/** The only legal next step, or null when the ride is done. */
export function nextStepFor(status: TripStatus): NextStep | null {
  const next = nextTripStage(status);
  if (!next) return null;
  const label = CHAUFFEUR_ACTION_LABELS[next];
  // A stage with no chauffeur-facing verb is not a step a chauffeur takes
  // (`confirmed` and `driver_assigned` are dispatch's), so nothing is offered.
  if (!label) return null;
  return { status: next, label };
}

export function statusLabel(status: TripStatus): string {
  return TRIP_STATUS_LABELS[status];
}

import type { Booking } from '../types/api';
import type { TripStatus } from '../lib/tripStatus';
import { nextTripStage } from '../lib/tripStatus';
import {
  DEMO_CORPORATE_ACCOUNT,
  DEMO_CORPORATE_EMPLOYEES,
  chauffeurById,
  DEMO_PAYMENT_METHODS,
  DEMO_PROFILE,
  DEMO_RECENT_LOCATIONS,
  DEMO_SAVED_LOCATIONS,
  DEMO_SAVED_PASSENGERS,
  DEMO_VEHICLES,
  seedBookings,
  seedTrip,
  seedTripEvents,
  tripVehicleFor,
} from './demoData';

/**
 * The in-memory backend behind demo mode.
 *
 * `apiRequest()` routes here instead of calling `fetch` when
 * `isDemoMode` is on, so every screen, store and API module keeps its exact
 * shape — nothing above this file knows the difference. That is the whole
 * reason it lives at the single fetch boundary rather than being sprinkled
 * through `src/api/*`.
 *
 * ── Writes are real, locally ────────────────────────────────────────────────
 * A demo where you can book a car but the trip never appears is a slideshow.
 * POST /bookings pushes onto this store, so the booking the client just made is
 * at the top of Trips a moment later. Nothing leaves the device, and there is no
 * host to leave to.
 *
 * State survives a page reload — see PERSISTENCE below. "Don't refresh" is not
 * a constraint a client will honour. Account → Reset demo clears it between
 * showings.
 */

interface DemoState {
  bookings: Booking[];
  /**
   * bookingId → chauffeur id. The role preview's dispatcher writes here; the
   * client's trip screen reads it as the trip's driver.
   *
   * It is a map beside the bookings rather than a column on them because the
   * backend does not put it on the booking either: assignment lives on
   * `trips.driver_id`, set by `POST /admin/trips/:id/assign-driver`. Keeping
   * the shape honest here means the day this preview becomes a product, the
   * mapping is already the right one.
   */
  assignments: Record<string, string>;
}

/**
 * PERSISTENCE.
 *
 * "Don't refresh mid-demo" is not a constraint anyone will honour — a client
 * will reload, a phone will drop the tab from memory and restore it, or two
 * people will open the link. If the booking they just made vanishes, the demo
 * has broken in front of them.
 *
 * So state is mirrored to localStorage, scoped to a versioned key. Every read
 * and write is wrapped: localStorage throws in private browsing on some
 * browsers, and is simply absent on native. Any failure falls through to the
 * seed, which is always a correct state to be in.
 */
const STORAGE_KEY = 'lct-universal:demo-state:v1';

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    // Touch it — presence is not the same as permission.
    localStorage.getItem(STORAGE_KEY);
    return localStorage;
  } catch {
    return null;
  }
}

function load(): DemoState | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    if (!Array.isArray(parsed.bookings) || parsed.bookings.length === 0) return null;
    return {
      bookings: parsed.bookings as Booking[],
      // Tolerated as missing rather than version-bumped: `assignments` arrived
      // with the role preview, and a state saved by an earlier build simply has
      // no key. Defaulting it keeps a booking someone made before the upgrade.
      assignments: (parsed.assignments as Record<string, string> | undefined) ?? {},
    };
  } catch {
    return null;
  }
}

function persist(): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota, private mode, or a browser that declines. The demo still works
    // in memory for this session; it just will not survive a reload.
  }
}

/** Clears persisted state and returns to the seed. Wired to Account → Reset demo. */
export function resetDemoState(): void {
  state.bookings = seedBookings(new Date());
  state.assignments = { ...seedAssignments() };
  const store = storage();
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do; the in-memory reset above already happened.
  }
}

/**
 * Who is already driving what, at the start of a showing.
 *
 * Every seeded ride that has reached `driver_assigned` or beyond must have a
 * chauffeur, or the dispatcher board would open contradicting itself — a row
 * saying "Chauffeur Assigned" in the status column and "Unassigned" in the
 * chauffeur column. The one deliberately unassigned ride is the one seeded at
 * `confirmed`, which is the honest way to be unassigned.
 */
function seedAssignments(): Record<string, string> {
  return {
    'demo-booking-upcoming': 'demo-driver',
    'demo-booking-past-1': 'demo-driver',
    'demo-booking-past-2': 'demo-chauffeur-2',
    'demo-fleet-late': 'demo-chauffeur-2',
    'demo-fleet-inprogress': 'demo-chauffeur-3',
    'demo-fleet-evening': 'demo-driver',
    // 'demo-fleet-unassigned' is absent on purpose.
  };
}

const state: DemoState = load() ?? { bookings: seedBookings(new Date()), assignments: seedAssignments() };

/** Deliberate, small, and uniform — a demo with zero latency reads as fake. */
const LATENCY_MS = 260;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** `/bookings/abc/trip` → ['bookings','abc','trip'] */
function segments(path: string): string[] {
  return path.split('?')[0]!.split('/').filter(Boolean);
}

function bookingById(id: string): Booking | undefined {
  return state.bookings.find((b) => b.id === id);
}

/**
 * Routes a request against the seeded dataset.
 *
 * Returns `{ handled: false }` for anything it does not know, so an unmapped
 * endpoint surfaces as a normal error state rather than as a silent empty
 * screen — the same rule the rest of this redesign follows.
 */
export async function handleDemoRequest(
  path: string,
  method: string,
  body: unknown,
): Promise<{ handled: true; data: unknown } | { handled: false }> {
  const seg = segments(path);
  const [root, second, third] = seg;

  if (root === 'vehicles') {
    if (second) {
      const vehicle = DEMO_VEHICLES.find((v) => v.id === second);
      return vehicle ? { handled: true, data: await delay({ vehicle }) } : { handled: false };
    }
    return { handled: true, data: await delay({ vehicles: DEMO_VEHICLES }) };
  }

  if (root === 'profiles' && second === 'me') {
    if (third === 'saved-locations') {
      return { handled: true, data: await delay({ locations: [...DEMO_SAVED_LOCATIONS, ...DEMO_RECENT_LOCATIONS] }) };
    }
    if (third === 'saved-passengers') {
      return { handled: true, data: await delay({ passengers: DEMO_SAVED_PASSENGERS }) };
    }
    if (third === 'payment-methods') {
      return { handled: true, data: await delay({ paymentMethods: DEMO_PAYMENT_METHODS }) };
    }
    return { handled: true, data: await delay({ profile: DEMO_PROFILE }) };
  }

  if (root === 'notifications') {
    return { handled: true, data: await delay({ notifications: [] }) };
  }

  if (root === 'concierge') {
    return {
      handled: true,
      /*
       * WRAPPED IN `{ intent }`, because that is what the real API returns.
       *
       * This used to answer with the intent FLAT, so `conciergeApi.send()` —
       * which reads `r.intent` — got undefined and the screen crashed on
       * `intent.assistantReply`. It never surfaced because the old concierge
       * caught every failure and pushed it into the transcript as an assistant
       * message: the app's crash wore the concierge's voice, and looked like a
       * reply. Removing that anti-pattern exposed this within minutes.
       *
       * Exactly the class of defect the endpoint-level contract diff cannot
       * see: the route and the envelope key both existed, and the PAYLOAD
       * SHAPE did not match.
       */
      data: await delay({
        intent: {
          assistantReply:
            'I can help with that. In this preview I cannot reach the AI service, so tell me the details and I will take you to the booking flow.',
          serviceType: 'airport' as const,
          pickupAddress: null,
          dropoffAddress: null,
          scheduledAtDescription: null,
          passengerCount: null,
          missingFields: ['pickupAddress', 'scheduledAt'],
        },
      }),
    };
  }

  if (root === 'bookings') {
    // POST /bookings — the write that makes the demo a product rather than a deck.
    if (!second && method === 'POST') {
      const input = (body ?? {}) as Record<string, unknown>;
      const vehicle = DEMO_VEHICLES.find((v) => v.id === input.vehicleId) ?? DEMO_VEHICLES[0]!;
      const template = state.bookings[0]!;
      const booking: Booking = {
        ...template,
        id: newId('demo-booking'),
        vehicle_id: vehicle.id,
        service_type: (input.serviceType as Booking['service_type']) ?? 'point_to_point',
        pickup_address: String(input.pickupAddress ?? template.pickup_address),
        dropoff_address: (input.dropoffAddress as string | undefined) ?? null,
        scheduled_at: String(input.scheduledAt ?? template.scheduled_at),
        passenger_count: Number(input.passengerCount ?? 1),
        luggage_count: Number(input.luggageCount ?? 0),
        status: 'confirmed',
      };
      // Fares come from the caller's own computed breakdown when present, so the
      // number on the vehicle card is the number stored — never re-typed here.
      const fare = input.allInFare as Record<string, number> | undefined;
      if (fare) {
        booking.base_fare = fare.baseFare!.toFixed(2);
        booking.distance_fare = fare.distanceFare!.toFixed(2);
        booking.time_fare = fare.timeFare!.toFixed(2);
        booking.surcharges = fare.surcharges!.toFixed(2);
        booking.gratuity = fare.gratuity!.toFixed(2);
        booking.tax = fare.tax!.toFixed(2);
        booking.total_fare = fare.totalFare!.toFixed(2);
      }
      state.bookings = [booking, ...state.bookings];
      persist();
      return { handled: true, data: await delay({ booking, tripId: seedTrip(booking).id }) };
    }

    if (second && third === 'trip') {
      const booking = bookingById(second);
      if (!booking) return { handled: false };
      // The ASSIGNED chauffeur, not a constant. This is the wire that carries a
      // dispatcher's assignment through to the client's tracking screen; before
      // the role preview existed, every trip reported Daniel regardless.
      // An unassigned ride reports null, and the client screens already handle
      // a null driver — they were built for a trip before dispatch reaches it.
      const driverId = state.assignments[booking.id] ?? null;
      return {
        handled: true,
        data: await delay({
          trip: seedTrip(booking, driverId),
          events: seedTripEvents(booking),
          driver: chauffeurById(driverId),
          vehicle: tripVehicleFor(booking),
        }),
      };
    }

    if (second && third === 'cancel' && method === 'POST') {
      const booking = bookingById(second);
      if (!booking) return { handled: false };
      booking.status = 'cancelled';
      persist();
      return { handled: true, data: await delay({ booking }) };
    }

    if (second) {
      const booking = bookingById(second);
      return booking ? { handled: true, data: await delay({ booking }) } : { handled: false };
    }

    /*
     * SCOPED TO THE SIGNED-IN PERSONA.
     *
     * The store now also holds other customers' rides, so the chauffeur and
     * dispatcher previews have a day's work to look at. The real endpoint scopes
     * to the authenticated profile; this one has to as well, or the client's
     * Trips list would show strangers' bookings. One dataset, three views — but
     * each view sees the slice its role is entitled to.
     */
    const mine = state.bookings.filter((b) => b.profile_id === DEMO_PROFILE.id);
    const upcoming = path.includes('upcoming=true');
    const rows = upcoming ? mine.filter((b) => b.status !== 'completed' && b.status !== 'cancelled') : mine;
    return { handled: true, data: await delay({ bookings: rows }) };
  }

  if (root === 'role-preview') {
    // Not a real endpoint and never called by the client app. It exists so the
    // role preview's reads go through the SAME latency and the same store as
    // every other screen, rather than reaching into module state synchronously
    // and reading as instant in a way nothing else in the demo does.
    return { handled: true, data: await delay({ bookings: state.bookings, assignments: { ...state.assignments } }) };
  }

  if (root === 'corporate') {
    // Answers with the seeded company rather than nulls — see DEMO_CORPORATE_ACCOUNT.
    // No pending approvals: the demo has no booking awaiting one, and an invented
    // approval queue would be a screen inventing work that does not exist.
    return {
      handled: true,
      data: await delay({
        account: DEMO_CORPORATE_ACCOUNT,
        employees: DEMO_CORPORATE_EMPLOYEES,
        bookings: [],
      }),
    };
  }

  return { handled: false };
}

/* ------------------------------------------------------------------ *
 * The role preview's writes.
 *
 * The chauffeur and dispatcher screens live in `src/dev/role/`, which is only
 * reachable from `app/_dev/role/` — blocked out of any non-demo build. They
 * write through these two functions rather than holding state of their own,
 * which is the whole reason a ride the client books turns up on the board and a
 * status the chauffeur sets turns up on the client's tracking screen. There is
 * one dataset; there are three ways of looking at it.
 * ------------------------------------------------------------------ */

/**
 * Assigns a chauffeur, and moves a merely-confirmed ride to `driver_assigned`.
 *
 * The status change is not decoration: the backend's own assign endpoint
 * (`POST /admin/trips/:id/assign-driver`) asserts the transition to
 * `driver_assigned` and applies it in the same request. Doing the same here
 * keeps the board's two columns from contradicting each other, and it is what
 * puts "Chauffeur Assigned" on the client's screen the moment dispatch acts.
 *
 * Re-assigning a ride that is already under way only changes who: advancing the
 * status again would be an illegal transition.
 */
export function assignChauffeur(bookingId: string, chauffeurId: string): void {
  const booking = bookingById(bookingId);
  if (!booking) return;
  state.assignments[bookingId] = chauffeurId;
  if (booking.status === 'pending' || booking.status === 'confirmed') {
    booking.status = 'driver_assigned';
  }
  persist();
}

/**
 * Advances a ride one stage — the only status write the chauffeur view makes.
 *
 * Forward-only, one step, and only along `TRIP_STAGE_ORDER`, which mirrors the
 * backend's `ALLOWED_TRANSITIONS`. That table is strictly linear for every
 * non-cancel transition, so "the next stage in order" and "the only legal next
 * status" are the same thing — which is exactly why the chauffeur screen can
 * show one button instead of a row of them.
 *
 * Returns the new status, or null if there was nowhere legal to go.
 */
export function advanceTripStatus(bookingId: string): TripStatus | null {
  const booking = bookingById(bookingId);
  if (!booking) return null;
  const next = nextTripStage(booking.status);
  if (!next) return null;
  booking.status = next;
  persist();
  return next;
}

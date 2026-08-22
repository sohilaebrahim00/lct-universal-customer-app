import type { Booking } from '../types/api';
import {
  DEMO_CONCIERGE,
  DEMO_CORPORATE_ACCOUNT,
  DEMO_CORPORATE_EMPLOYEES,
  DEMO_DRIVER,
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
    return { bookings: parsed.bookings as Booking[] };
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
  const store = storage();
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do; the in-memory reset above already happened.
  }
}

const state: DemoState = load() ?? { bookings: seedBookings(new Date()) };

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
    const last = DEMO_CONCIERGE[DEMO_CONCIERGE.length - 1];
    return {
      handled: true,
      data: await delay({
        assistantReply: last?.content ?? 'I can help with that.',
        serviceType: null,
        pickupAddress: null,
        dropoffAddress: null,
        passengerCount: null,
        missingFields: ['pickupAddress'],
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
      return {
        handled: true,
        data: await delay({
          trip: seedTrip(booking),
          events: seedTripEvents(booking),
          driver: DEMO_DRIVER,
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

    const upcoming = path.includes('upcoming=true');
    const rows = upcoming
      ? state.bookings.filter((b) => b.status !== 'completed' && b.status !== 'cancelled')
      : state.bookings;
    return { handled: true, data: await delay({ bookings: rows }) };
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

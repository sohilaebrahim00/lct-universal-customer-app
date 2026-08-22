import type { Booking, TripDriverInfo, TripVehicleInfo, Vehicle } from '../types/api';

/**
 * FIXTURE DATA — development only. Never imported by a screen.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * Three of Home's five states (populated, loading, failed) are unreachable in
 * this environment: `load()` only calls the API when the user is signed in, and
 * with no Supabase configured the app is permanently a guest. There is also no
 * backend to reach — see the investigation in the slice report. Without a
 * harness those states could never be reviewed, and that gets worse in the
 * slices covering live tracking and the app-wide state sweep, not better.
 *
 * ── The fences, and how each is held ────────────────────────────────────────
 *  1. Dev-only            — the route guards on `__DEV__`, and metro.config.js
 *                           blocks this directory from a production build.
 *  2. Unreachable         — nothing in `app/` links to `/_dev/*`.
 *  3. Visibly labelled    — EVERY human-readable string below starts with
 *                           `FIXTURE_PREFIX`, so a fixture value cannot be
 *                           mistaken for real data in a screenshot, a demo or a
 *                           client deck. This is deliberately ugly. A fixture
 *                           that looks real is exactly how invented data ends up
 *                           in front of a customer.
 *  4. Isolated            — fixtures live here, in `src/dev/`. No file under
 *                           `app/` (other than `app/_dev/`) or `src/components/`
 *                           may import this module.
 *  5. Verifiably excluded — `EXCLUSION_MARKER` is a unique string. If it appears
 *                           in the exported production bundle, the exclusion has
 *                           failed and the harness must be reconsidered.
 *
 * These are NOT mock data in the sense rule 4 forbids. No shipped screen renders
 * them; they exist to photograph states that already exist in code.
 */

/** Unique, greppable. Asserted absent from the production bundle. */
export const EXCLUSION_MARKER = 'LCT_FIXTURE_MARKER_MUST_NOT_SHIP_7f3a91';

/** Prefixes every human-readable fixture string. */
export const FIXTURE_PREFIX = 'FIXTURE';

const f = (text: string) => `${FIXTURE_PREFIX} ${text}`;

/** A fixed instant, so a screenshot diff is a real change rather than the clock moving. */
export const FIXTURE_NOW = new Date('2026-08-22T09:41:00.000Z');
const inHours = (h: number) => new Date(FIXTURE_NOW.getTime() + h * 3_600_000).toISOString();
const daysAgo = (d: number) => new Date(FIXTURE_NOW.getTime() - d * 86_400_000).toISOString();

/**
 * The reference trip from the design: 18.4 miles, Friday 1:15 PM, and the three
 * all-in fares the artboard quotes — $261 sedan, $318 SUV, $402 Sprinter.
 */
export const FIXTURE_TRIP = {
  distanceMiles: 23.2,
  durationMinutes: 42,
  scheduledAt: inHours(3.2),
} as const;

function booking(overrides: Partial<Booking> & Pick<Booking, 'id' | 'status' | 'scheduled_at' | 'total_fare'>): Booking {
  return {
    profile_id: 'fixture-profile',
    corporate_account_id: null,
    service_type: 'airport',
    vehicle_id: 'fixture-vehicle-sedan',
    pickup_address: f('4820 Maple Ave, Dallas'),
    pickup_lat: null,
    pickup_lng: null,
    dropoff_address: f('DFW Terminal D'),
    dropoff_lat: null,
    dropoff_lng: null,
    hourly_duration_hours: null,
    passenger_count: 2,
    luggage_count: 2,
    primary_passenger_name: null,
    primary_passenger_phone: null,
    special_requests: null,
    flight_number: null,
    approval_status: 'auto_approved',
    base_fare: '145.00',
    distance_miles: '23.2',
    distance_fare: '58.00',
    time_fare: '0.00',
    surcharges: '0.00',
    gratuity: '40.60',
    tax: '17.40',
    currency: 'usd',
    ...overrides,
  } as Booking;
}

export const FIXTURE_UPCOMING = booking({
  id: 'fixture-booking-upcoming',
  status: 'driver_assigned',
  scheduled_at: FIXTURE_TRIP.scheduledAt,
  total_fare: '261.00',
});

export const FIXTURE_PAST: Booking[] = [
  booking({
    id: 'fixture-booking-past-1',
    status: 'completed',
    scheduled_at: daysAgo(8),
    total_fare: '261.00',
  }),
  booking({
    id: 'fixture-booking-past-2',
    status: 'completed',
    scheduled_at: daysAgo(21),
    service_type: 'hourly',
    vehicle_id: 'fixture-vehicle-suv',
    pickup_address: f('2100 Ross Ave, Dallas'),
    dropoff_address: null,
    hourly_duration_hours: 4,
    total_fare: '520.00',
  }),
];

export const FIXTURE_DRIVER: TripDriverInfo = {
  id: 'fixture-driver',
  full_name: f('Chauffeur'),
  avatar_url: null,
  rating: '4.98',
};

/**
 * Only `name` and `type` — because that is genuinely all the backend returns.
 * The fixture does not invent a plate or a colour; see BACKEND_FOLLOWUPS.md §1.
 * Fixtures exist to photograph real states, not to preview fields that do not
 * exist.
 */
export const FIXTURE_TRIP_VEHICLE: TripVehicleInfo = {
  name: f('Executive Sedan'),
  type: 'executive_sedan',
};

/** The three fleet classes, priced so `calculateFarePreview` lands on the artboard's figures. */
export const FIXTURE_VEHICLES: Vehicle[] = [
  {
    id: 'fixture-vehicle-sedan',
    type: 'executive_sedan',
    name: f('Executive Sedan'),
    description: f('Mercedes S-Class or similar'),
    capacity_passengers: 3,
    capacity_luggage: 2,
    base_rate: '145.00',
    per_mile_rate: '3.15',
    per_hour_rate: '95.00',
    image_url: null,
    is_active: true,
    // Null on every real row too: `vehicles` is a fare-class table, so no
    // physical car and therefore no plate or colour. See BACKEND_FOLLOWUPS.md §1.
    license_plate: null,
    color: null,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    updated_at: new Date('2026-01-01T00:00:00Z').toISOString(),
  },
  {
    id: 'fixture-vehicle-suv',
    type: 'suv',
    name: f('Luxury SUV'),
    description: f('Cadillac Escalade or similar'),
    capacity_passengers: 6,
    capacity_luggage: 5,
    base_rate: '178.00',
    per_mile_rate: '3.80',
    per_hour_rate: '130.00',
    image_url: null,
    is_active: true,
    // Null on every real row too: `vehicles` is a fare-class table, so no
    // physical car and therefore no plate or colour. See BACKEND_FOLLOWUPS.md §1.
    license_plate: null,
    color: null,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    updated_at: new Date('2026-01-01T00:00:00Z').toISOString(),
  },
  {
    id: 'fixture-vehicle-sprinter',
    type: 'sprinter',
    name: f('Sprinter'),
    description: f('Mercedes Sprinter Executive'),
    capacity_passengers: 11,
    capacity_luggage: 10,
    base_rate: '225.00',
    per_mile_rate: '4.80',
    per_hour_rate: '165.00',
    image_url: null,
    is_active: true,
    // Null on every real row too: `vehicles` is a fare-class table, so no
    // physical car and therefore no plate or colour. See BACKEND_FOLLOWUPS.md §1.
    license_plate: null,
    color: null,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    updated_at: new Date('2026-01-01T00:00:00Z').toISOString(),
  },
];

export const FIXTURE_VEHICLE_NAMES: Record<string, string> = Object.fromEntries(
  FIXTURE_VEHICLES.map((v) => [v.id, v.name]),
);

export const FIXTURE_PROFILE = {
  full_name: f('Michael Okafor'),
  avatar_url: null as string | null,
};

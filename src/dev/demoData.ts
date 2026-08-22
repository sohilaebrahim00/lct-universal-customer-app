import type {
  Booking,
  PaymentMethodRecord,
  Profile,
  SavedLocation,
  SavedPassenger,
  TripDriverInfo,
  TripStatusEvent,
  TripVehicleInfo,
  Trip,
  Vehicle,
} from '../types/api';
import { calculateFarePreview } from '../lib/pricingPreview';

/**
 * DEMO DATA — the seeded dataset behind `EXPO_PUBLIC_DEMO_MODE`.
 *
 * ── What this is and is not ─────────────────────────────────────────────────
 * It is a stand-in for a backend that is not reachable from here: the API URL is
 * a local placeholder (`http://localhost:4000`), nothing is deployed, and every
 * client repo points at the same localhost default. A deployed demo cannot reach
 * any of that, so it carries its own data.
 *
 * It is NOT invented pricing. The computable rates below are copied from the
 * backend's own `db/seed.sql`, and every fare on screen is produced from them by
 * the real `calculateFarePreview()` — the same function the booking flow uses.
 * The website's published starting prices are recorded separately, verbatim, at
 * the bottom of this file. No figure anywhere is typed into a component.
 *
 * The two sources DISAGREE. See WEBSITE_PUBLISHED_RATES below and
 * BACKEND_FOLLOWUPS.md §6 — not reconciled here, because which one is correct is
 * a business decision.
 *
 * It is also NOT a set of invented service promises. There is no cancellation
 * window, no complimentary wait time and no dispatch phone here: those live in
 * `servicePolicy` and are still null, so the slots that would state them render
 * nothing. Same for testimonials — `ReviewsSection` stays deleted.
 *
 * ── Where the licence plate is ──────────────────────────────────────────────
 * Nowhere, deliberately. `TripVehicleInfo` is `{ name, type }` and the backend's
 * `vehicles` table is a fare-class table with no plate, colour or make/model
 * (BACKEND_FOLLOWUPS.md §1). Seeding one here would make a field that does not
 * exist look shipped.
 */

/** Rates copied verbatim from lct-universal-backend/db/seed.sql. */
export const DEMO_VEHICLES: Vehicle[] = [
  {
    id: 'demo-vehicle-sedan',
    type: 'executive_sedan',
    name: 'Executive Sedan',
    description: 'Mercedes-Benz S-Class or equivalent — up to 3 passengers, premium point-to-point and airport service.',
    capacity_passengers: 3,
    capacity_luggage: 3,
    base_rate: '65.00',
    per_mile_rate: '3.25',
    per_hour_rate: '100.00',
    image_url: null,
    is_active: true,
  },
  {
    id: 'demo-vehicle-suv',
    type: 'suv',
    name: 'Executive SUV',
    description: 'Cadillac Escalade or equivalent — up to 6 passengers, ideal for groups and extra luggage.',
    capacity_passengers: 6,
    capacity_luggage: 6,
    base_rate: '85.00',
    per_mile_rate: '3.75',
    per_hour_rate: '120.00',
    image_url: null,
    is_active: true,
  },
  {
    id: 'demo-vehicle-sprinter',
    type: 'sprinter',
    name: 'Sprinter Van',
    description: 'Mercedes-Benz Sprinter — up to 14 passengers, corporate groups and event transport.',
    capacity_passengers: 14,
    capacity_luggage: 14,
    base_rate: '150.00',
    per_mile_rate: '4.50',
    per_hour_rate: '200.00',
    image_url: null,
    is_active: true,
  },
];

export const DEMO_PROFILE: Profile = {
  id: 'demo-profile',
  role: 'customer',
  full_name: 'Michael Okafor',
  email: 'm.okafor@northline.co',
  phone: '+1 (214) 555-0148',
  avatar_url: null,
  corporate_account_id: 'demo-corporate',
  corporate_role: 'manager',
  created_at: new Date('2025-11-04T10:00:00Z').toISOString(),
  updated_at: new Date('2026-08-01T10:00:00Z').toISOString(),
};

export const DEMO_DRIVER: TripDriverInfo = {
  id: 'demo-driver',
  full_name: 'Daniel A.',
  avatar_url: null,
  rating: '4.98',
};

/**
 * DALLAS-FORT WORTH. LCT Universal operates in DFW and Grapevine, Texas — the
 * app's own copy says so on About, Airport and Corporate. Every seeded place
 * here is a real DFW location with its real coordinates.
 */
export const DEMO_SAVED_LOCATIONS: SavedLocation[] = [
  { id: 'demo-loc-home', label: 'Home', address: '4820 Maple Ave, Dallas, TX', lat: 32.8121, lng: -96.8175 },
  { id: 'demo-loc-office', label: 'Northline HQ', address: '2100 Ross Ave, Dallas, TX', lat: 32.7873, lng: -96.7969 },
  { id: 'demo-loc-dfw', label: 'DFW Terminal D', address: '2337 S International Pkwy, DFW Airport, TX', lat: 32.8969, lng: -97.0381 },
];

export const DEMO_RECENT_LOCATIONS: SavedLocation[] = [
  { id: 'demo-recent-1', label: 'Gaylord Texan', address: '1501 Gaylord Trail, Grapevine, TX', lat: 32.9618, lng: -97.0645 },
  { id: 'demo-recent-2', label: 'Dallas Love Field', address: '8008 Herb Kelleher Way, Dallas, TX', lat: 32.8481, lng: -96.8512 },
];

export const DEMO_SAVED_PASSENGERS: SavedPassenger[] = [
  { id: 'demo-pax-1', full_name: 'Priya Raman', phone: '+1 (214) 555-0192', email: 'p.raman@northline.co' },
  { id: 'demo-pax-2', full_name: 'Tomas Lindqvist', phone: '+1 (817) 555-0117', email: null },
];

export const DEMO_PAYMENT_METHODS: PaymentMethodRecord[] = [
  {
    id: 'demo-pm-1',
    stripe_payment_method_id: 'pm_demo',
    brand: 'amex',
    last4: '4021',
    exp_month: 11,
    exp_year: 2029,
    is_default: true,
  },
];

/* ------------------------------------------------------------------ *
 * Bookings — fares COMPUTED, never typed.
 * ------------------------------------------------------------------ */

const HOURS = 3_600_000;

function makeBooking(input: {
  id: string;
  vehicle: Vehicle;
  status: Booking['status'];
  scheduledAt: Date;
  distanceMiles: number;
  pickup: string;
  dropoff: string | null;
  serviceType?: Booking['service_type'];
  passengers?: number;
}): Booking {
  const { id, vehicle, status, scheduledAt, distanceMiles, pickup, dropoff } = input;
  const serviceType = input.serviceType ?? 'airport';

  // The real pricing function, on the real rate card. This is why no component
  // in this app contains a hardcoded price.
  const fare = calculateFarePreview({
    vehicle: {
      baseRate: Number(vehicle.base_rate),
      perMileRate: Number(vehicle.per_mile_rate),
      perHourRate: vehicle.per_hour_rate === null ? null : Number(vehicle.per_hour_rate),
    },
    serviceType,
    distanceMiles,
    scheduledAt,
  });

  return {
    id,
    profile_id: DEMO_PROFILE.id,
    corporate_account_id: null,
    service_type: serviceType,
    vehicle_id: vehicle.id,
    pickup_address: pickup,
    pickup_lat: null,
    pickup_lng: null,
    dropoff_address: dropoff,
    dropoff_lat: null,
    dropoff_lng: null,
    scheduled_at: scheduledAt.toISOString(),
    hourly_duration_hours: null,
    passenger_count: input.passengers ?? 2,
    luggage_count: 2,
    primary_passenger_name: null,
    primary_passenger_phone: null,
    special_requests: null,
    flight_number: null,
    status,
    approval_status: 'auto_approved',
    base_fare: fare.baseFare.toFixed(2),
    distance_miles: String(distanceMiles),
    distance_fare: fare.distanceFare.toFixed(2),
    time_fare: fare.timeFare.toFixed(2),
    surcharges: fare.surcharges.toFixed(2),
    gratuity: fare.gratuity.toFixed(2),
    tax: fare.tax.toFixed(2),
    total_fare: fare.totalFare.toFixed(2),
    currency: 'usd',
  } as Booking;
}

const sedan = DEMO_VEHICLES[0] as Vehicle;
const suv = DEMO_VEHICLES[1] as Vehicle;

/** Built at module load so "a few hours out" is relative to whenever the demo is opened. */
export function seedBookings(now: Date): Booking[] {
  return [
    makeBooking({
      id: 'demo-booking-upcoming',
      vehicle: sedan,
      status: 'driver_assigned',
      scheduledAt: new Date(now.getTime() + 3.2 * HOURS),
      distanceMiles: 23.2,
      pickup: '4820 Maple Ave, Dallas, TX',
      dropoff: 'DFW Terminal D, DFW Airport, TX',
    }),
    makeBooking({
      id: 'demo-booking-past-1',
      vehicle: sedan,
      status: 'completed',
      scheduledAt: new Date(now.getTime() - 8 * 24 * HOURS),
      distanceMiles: 23.2,
      pickup: '4820 Maple Ave, Dallas, TX',
      dropoff: 'DFW Terminal D, DFW Airport, TX',
    }),
    makeBooking({
      id: 'demo-booking-past-2',
      vehicle: suv,
      status: 'completed',
      scheduledAt: new Date(now.getTime() - 21 * 24 * HOURS),
      distanceMiles: 26.4,
      pickup: '2100 Ross Ave, Dallas, TX',
      dropoff: 'Gaylord Texan, Grapevine, TX',
      serviceType: 'corporate',
      passengers: 4,
    }),
  ];
}

export function seedTrip(booking: Booking): Trip {
  return {
    id: `demo-trip-${booking.id}`,
    booking_id: booking.id,
    driver_id: DEMO_DRIVER.id,
    vehicle_id: booking.vehicle_id,
    status: booking.status,
    driver_current_lat: 34.0736,
    driver_current_lng: -118.3994,
    driver_location_updated_at: new Date().toISOString(),
    eta_minutes: 6,
    picked_up_at: null,
    started_at: null,
    completed_at: booking.status === 'completed' ? booking.scheduled_at : null,
    cancelled_at: null,
  };
}

export function seedTripEvents(booking: Booking): TripStatusEvent[] {
  const at = (offsetMinutes: number) =>
    new Date(new Date(booking.scheduled_at).getTime() - offsetMinutes * 60_000).toISOString();
  return [
    { status: 'confirmed', note: null, created_at: at(240) },
    { status: 'driver_assigned', note: null, created_at: at(60) },
  ];
}

export function tripVehicleFor(booking: Booking): TripVehicleInfo {
  const vehicle = DEMO_VEHICLES.find((v) => v.id === booking.vehicle_id) ?? sedan;
  return { name: vehicle.name, type: vehicle.type };
}

/** A short conversation, so the concierge screen is not an empty list. */
export const DEMO_CONCIERGE: { role: 'user' | 'assistant'; content: string }[] = [
  {
    role: 'assistant',
    content:
      "Good afternoon. I'm the LCT Universal concierge — tell me what you need and I'll take care of it.",
  },
  { role: 'user', content: 'Can you move tomorrow morning’s pickup to 9am and add a child seat?' },
  {
    role: 'assistant',
    content:
      'Of course. I can shift the pickup and add a forward-facing seat at no charge — confirm the new time on the trip and I’ll note the seat for your chauffeur.',
  },
];

/* ------------------------------------------------------------------ *
 * The website's published rate card.
 * ------------------------------------------------------------------ */

/**
 * Verbatim from the LCT Universal website —
 * `LCT-Universal-Vite-Ready-v2/lct_migrate/src/lib/site-data.ts`,
 * `VERIFIED_LIVE_VEHICLE_CLASSES` (lines 281-289), cross-checked against
 * `FLEET_VEHICLES`' `priceFrom`/`priceLabel` in the same file.
 *
 * ── This is a DISPLAY rate card, not a computable one ───────────────────────
 * The site publishes starting prices, one hourly rate, and quote-only classes.
 * It publishes no per-mile rate, no gratuity rate and no tax rate, so nothing
 * here can produce a total. The site's own comments are explicit that the live
 * system "did not confirm this is an hourly base rate, only a current per-trip
 * display value, so no hourly semantics are invented".
 *
 * So these labels are shown where a starting price is the right thing to show —
 * browsing the fleet — and NO per-mile rate has been derived backwards from
 * them. Inventing a derivation would be the same error as inventing a rate.
 *
 * ── It disagrees with the backend, materially ───────────────────────────────
 * See BACKEND_FOLLOWUPS.md §6. Summary: the advertised "From $95" floor is
 * below the backend's own minimum charge ($83.36); "First Class Sedan
 * $150/hour" has no backend class at all; the site marks Sprinter and both
 * coaches "Request Quote" while the backend prices them; and three capacities
 * differ. Not reconciled here — that is a business decision.
 */
/**
 * Classes the website marks "Request Quote". The app must NOT produce a number
 * for these: quoting a fixed price for a vehicle the business has said it will
 * not price without asking commits LCT to a promise it never made — the same
 * failure as an invented policy figure.
 */
export const QUOTE_ONLY_VEHICLE_TYPES: readonly string[] = ['sprinter', 'coach'];

export const WEBSITE_PUBLISHED_RATES: Record<string, string> = {
  // Backend `vehicle_type` → the website's published label, unchanged.
  executive_sedan: 'From $95',
  suv: 'From $110',
  sprinter: 'Request Quote',
  coach: 'Request Quote',
};

/** Website classes with no backend equivalent, recorded so the gap is not lost. */
export const WEBSITE_CLASSES_WITHOUT_BACKEND_EQUIVALENT = [
  { name: 'Luxury SUV', priceLabel: 'From $130' },
  { name: 'First Class Sedan', priceLabel: '$150/hour' },
] as const;

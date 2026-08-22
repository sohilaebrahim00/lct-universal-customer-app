import type {
  Booking,
  CorporateAccount,
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
import { TRIP_STAGE_ORDER, stageIndex } from '../lib/tripStatus';

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
 * Nowhere, deliberately — but the reason is narrower than this comment used to
 * claim, and the correction matters.
 *
 * `vehicles.license_plate` and `vehicles.color` DO exist: migration 0022 adds
 * them. What does not exist is a physical vehicle. The `vehicles` table is a
 * fare-class table — three rows, one per class — and 0022's own comment says
 * the new columns are nullable because "existing seeded rows represent a fleet
 * *class*, not a specific plated vehicle". Every row leaves them null. Make and
 * model exist nowhere at all. `TripVehicleInfo`, what this app actually
 * receives, is still `{ name, type }`.
 *
 * So seeding a plate here would not be filling in a missing column; it would be
 * inventing a physical car the fleet does not model. See BACKEND_FOLLOWUPS.md §1.
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

/**
 * The company behind `DEMO_PROFILE`.
 *
 * `DEMO_PROFILE` already carries `corporate_account_id: 'demo-corporate'` and
 * the manager role, which is what puts Corporate in the Account list. The demo
 * API used to answer that endpoint with `{ account: null, employees: [] }`, so
 * a persona who demonstrably HAS a company account was shown a corporate screen
 * with nothing on it — the same lie the empty catches used to produce, arriving
 * by a different route. This is the demo half of that fix; the app half is the
 * unresolved-account branch in `app/(app)/account/corporate.tsx`.
 *
 * Invented, like the rest of this file, and fenced in `src/dev/` for the same
 * reason: it is the seeded demo persona, not a claim about a real customer.
 * Northline matches the persona's existing email domain.
 */
export const DEMO_CORPORATE_ACCOUNT: CorporateAccount = {
  id: 'demo-corporate',
  company_name: 'Northline Partners',
  billing_email: 'ap@northline.co',
  billing_address: '2100 Ross Ave, Suite 1400, Dallas, TX 75201',
  requires_ride_approval: true,
  monthly_spend_limit: null,
};

/**
 * The persona's colleagues on that account. Same fence, same reason.
 *
 * Deliberately the SAME two people as `DEMO_SAVED_PASSENGERS` below, down to
 * the phone numbers — in a real corporate account the colleagues you book cars
 * for and the colleagues on the account are one set of people. Two overlapping
 * but subtly different casts would make the demo look like two databases.
 */
export const DEMO_CORPORATE_EMPLOYEES: Profile[] = [
  DEMO_PROFILE,
  {
    id: 'demo-employee-2',
    role: 'customer',
    full_name: 'Priya Raman',
    email: 'p.raman@northline.co',
    phone: '+1 (214) 555-0192',
    avatar_url: null,
    corporate_account_id: 'demo-corporate',
    corporate_role: 'employee',
    created_at: new Date('2026-01-12T10:00:00Z').toISOString(),
    updated_at: new Date('2026-08-01T10:00:00Z').toISOString(),
  },
  {
    id: 'demo-employee-3',
    role: 'customer',
    full_name: 'Tomas Lindqvist',
    email: 't.lindqvist@northline.co',
    phone: '+1 (817) 555-0117',
    avatar_url: null,
    corporate_account_id: 'demo-corporate',
    corporate_role: 'employee',
    created_at: new Date('2026-03-02T10:00:00Z').toISOString(),
    updated_at: new Date('2026-08-01T10:00:00Z').toISOString(),
  },
];

export const DEMO_DRIVER: TripDriverInfo = {
  id: 'demo-driver',
  // Full name, not "Daniel A.". Abbreviating the surname is a ride-hailing
  // privacy convention — a chauffeur service introduces the person.
  full_name: 'Daniel Alvarez',
  avatar_url: null,
  rating: '4.98',
};

/**
 * The chauffeurs the dispatcher preview can assign a ride to.
 *
 * `rating` is null on all but Daniel, whose figure predates this work and is
 * already on the client's trip screen. No rating, tenure, trip count or
 * earnings figure is invented for the other two, and the role preview does not
 * display any of those fields for anyone — see the role-preview section of
 * BACKEND_FOLLOWUPS.md.
 *
 * `TripDriverInfo` is the only chauffeur shape this app has, and it carries no
 * phone number, so the dispatcher preview cannot offer "call the chauffeur".
 * That is a gap, recorded, not a feature that was skipped.
 */
export const DEMO_CHAUFFEURS: TripDriverInfo[] = [
  DEMO_DRIVER,
  { id: 'demo-chauffeur-2', full_name: 'Renata Silva', avatar_url: null, rating: null },
  { id: 'demo-chauffeur-3', full_name: 'Curtis Boone', avatar_url: null, rating: null },
];

export function chauffeurById(id: string | null): TripDriverInfo | null {
  if (!id) return null;
  return DEMO_CHAUFFEURS.find((c) => c.id === id) ?? null;
}

/**
 * Other people with rides on today's board.
 *
 * The dispatcher and chauffeur views look at the whole day's work, not one
 * customer's, so the seed needs customers besides the persona. `profiles` is a
 * real table and `full_name` a real column — the dispatcher board resolves the
 * client name through `booking.profile_id`, exactly as the backend's own
 * `listAllBookings` does with `join profiles p on p.id = b.profile_id`.
 */
export const DEMO_CUSTOMERS: Profile[] = [
  DEMO_PROFILE,
  {
    id: 'demo-customer-2',
    role: 'customer',
    full_name: 'Alice Kwan',
    email: 'a.kwan@meridianlaw.com',
    phone: '+1 (214) 555-0164',
    avatar_url: null,
    corporate_account_id: null,
    corporate_role: null,
    created_at: new Date('2026-02-18T10:00:00Z').toISOString(),
    updated_at: new Date('2026-08-01T10:00:00Z').toISOString(),
  },
  {
    id: 'demo-customer-3',
    role: 'customer',
    full_name: 'Hendrik de Vries',
    email: 'h.devries@arclightenergy.com',
    phone: '+1 (469) 555-0133',
    avatar_url: null,
    corporate_account_id: null,
    corporate_role: null,
    created_at: new Date('2025-09-30T10:00:00Z').toISOString(),
    updated_at: new Date('2026-08-01T10:00:00Z').toISOString(),
  },
  {
    id: 'demo-customer-4',
    role: 'customer',
    full_name: 'Yolanda Pierce',
    email: 'y.pierce@northline.co',
    phone: '+1 (817) 555-0109',
    avatar_url: null,
    corporate_account_id: 'demo-corporate',
    corporate_role: 'employee',
    created_at: new Date('2026-05-06T10:00:00Z').toISOString(),
    updated_at: new Date('2026-08-01T10:00:00Z').toISOString(),
  },
];

export function customerById(id: string): Profile | null {
  return DEMO_CUSTOMERS.find((c) => c.id === id) ?? null;
}

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
  /** Defaults to the demo persona. Set for the other customers on today's board. */
  profileId?: string;
  luggage?: number;
  /** `bookings.flight_number` — a real, existing column. */
  flightNumber?: string | null;
  /** `bookings.special_requests` — a real, existing column. */
  specialRequests?: string | null;
  /** `bookings.primary_passenger_name` — real, and nullable, which is the point. */
  passengerName?: string | null;
  passengerPhone?: string | null;
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
    profile_id: input.profileId ?? DEMO_PROFILE.id,
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
    luggage_count: input.luggage ?? 2,
    primary_passenger_name: input.passengerName ?? null,
    primary_passenger_phone: input.passengerPhone ?? null,
    special_requests: input.specialRequests ?? null,
    flight_number: input.flightNumber ?? null,
    status,
    approval_status: 'auto_approved',
    base_fare: fare.baseFare.toFixed(2),
    distance_miles: String(distanceMiles),
    distance_fare: fare.distanceFare.toFixed(2),
    time_fare: fare.timeFare.toFixed(2),
    surcharges: fare.surcharges.toFixed(2),
    /*
     * Zero, and honestly zero.
     *
     * The real API has returned these three since migration 0015 and the demo
     * has to carry the same shape, or `serverFareFrom()` reads `undefined`
     * where the backend would give it a figure. They are '0.00' rather than
     * invented values because `calculateFarePreview()` — which prices every
     * demo booking — has no concept of waiting time, extra stops or a promo
     * code, and seeding a number the demo cannot derive would be inventing one.
     * Zero-valued lines render nothing, so the demo breakdown is unchanged.
     */
    waiting_fare: '0.00',
    extra_stops_fare: '0.00',
    discount_amount: '0.00',
    gratuity: fare.gratuity.toFixed(2),
    tax: fare.tax.toFixed(2),
    total_fare: fare.totalFare.toFixed(2),
    currency: 'usd',
  } as Booking;
}

const sedan = DEMO_VEHICLES[0] as Vehicle;
const suv = DEMO_VEHICLES[1] as Vehicle;

/**
 * The rest of today's work — rides belonging to other customers.
 *
 * These exist so the dispatcher board and the chauffeur's Today list have a
 * DAY in them rather than one ride, and so the board has the two rows a
 * dispatcher actually looks for: one nobody is assigned to, and one that is
 * running late. Both of those states are computed from the data (no chauffeur
 * assigned; scheduled time passed with the status not advanced) rather than
 * flagged, because the backend models neither — see BACKEND_FOLLOWUPS.md.
 *
 * They are NEVER returned to the client app. `GET /bookings` in demoApi scopes
 * to the signed-in persona, the way the real endpoint scopes to the
 * authenticated profile, so the client's Trips list is unchanged by any of this.
 */
function fleetBookings(now: Date): Booking[] {
  const MIN = 60_000;
  return [
    // Running late: pickup was 25 minutes ago and the chauffeur has not moved
    // off "assigned". This is the row the board has to surface.
    makeBooking({
      id: 'demo-fleet-late',
      vehicle: suv,
      status: 'driver_assigned',
      scheduledAt: new Date(now.getTime() - 25 * MIN),
      distanceMiles: 18.6,
      pickup: 'Hotel Crescent Court, 400 Crescent Ct, Dallas, TX',
      dropoff: 'Dallas Love Field, 8008 Herb Kelleher Way, Dallas, TX',
      serviceType: 'airport',
      profileId: 'demo-customer-3',
      passengers: 3,
      luggage: 4,
      flightNumber: 'WN 1184',
      passengerName: 'Hendrik de Vries',
      passengerPhone: '+1 (469) 555-0133',
      specialRequests: 'Two golf bags. Kerbside at the Crescent Court main entrance.',
    }),
    // Mid-trip, so the board is not all one status.
    makeBooking({
      id: 'demo-fleet-inprogress',
      vehicle: sedan,
      status: 'trip_started',
      scheduledAt: new Date(now.getTime() - 70 * MIN),
      distanceMiles: 12.1,
      pickup: '1717 McKinney Ave, Dallas, TX',
      dropoff: 'Gaylord Texan, 1501 Gaylord Trail, Grapevine, TX',
      serviceType: 'corporate',
      profileId: 'demo-customer-4',
      passengers: 2,
      luggage: 1,
      passengerName: 'Yolanda Pierce',
      passengerPhone: '+1 (817) 555-0109',
    }),
    // Nobody assigned. The other row a dispatcher is looking for.
    makeBooking({
      id: 'demo-fleet-unassigned',
      vehicle: sedan,
      status: 'confirmed',
      scheduledAt: new Date(now.getTime() + 95 * MIN),
      distanceMiles: 9.4,
      pickup: 'Meridian Law, 2101 Cedar Springs Rd, Dallas, TX',
      dropoff: 'The Ritz-Carlton, 2121 McKinney Ave, Dallas, TX',
      serviceType: 'point_to_point',
      profileId: 'demo-customer-2',
      passengers: 1,
      luggage: 0,
      passengerName: 'Alice Kwan',
      passengerPhone: '+1 (214) 555-0164',
      specialRequests: 'Quiet ride — call ahead rather than ringing the office.',
    }),
    // Later today, assigned, with a flight number and a meet-and-greet note —
    // the ride the chauffeur's job detail is worth reading before.
    makeBooking({
      id: 'demo-fleet-evening',
      vehicle: suv,
      status: 'driver_assigned',
      scheduledAt: new Date(now.getTime() + 5.5 * HOURS),
      distanceMiles: 22.8,
      pickup: 'DFW Terminal A, 2337 S International Pkwy, DFW Airport, TX',
      dropoff: '3400 Oak Lawn Ave, Dallas, TX',
      serviceType: 'airport',
      profileId: 'demo-customer-2',
      passengers: 2,
      luggage: 3,
      flightNumber: 'AA 2317',
      passengerName: 'Alice Kwan',
      passengerPhone: '+1 (214) 555-0164',
      specialRequests: 'Meet inside baggage claim. Second passenger joining at the kerb.',
    }),
  ];
}

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
    // The persona's own rides come FIRST: demoApi uses bookings[0] as the shape
    // template for a new booking, and the client's Home reads the soonest of
    // their own. Fleet rides are appended, never prepended.
    ...fleetBookings(now),
  ];
}

export function seedTrip(booking: Booking, driverId: string | null = DEMO_DRIVER.id): Trip {
  return {
    id: `demo-trip-${booking.id}`,
    booking_id: booking.id,
    driver_id: driverId,
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

/**
 * The timeline, derived from the booking's ACTUAL status.
 *
 * It used to return a fixed pair — confirmed, then driver_assigned — which was
 * right for the one seeded booking and wrong for everything else. With a
 * dispatcher in the picture a ride genuinely starts unassigned, so a timeline
 * that always claimed a chauffeur had been assigned would contradict the board
 * the ride was sitting on, and would contradict the chauffeur's own status
 * screen the moment they advanced it.
 *
 * Now it walks `TRIP_STAGE_ORDER` up to wherever the booking has reached. Times
 * are spaced backwards from the pickup, so an early stage reads as older.
 */
export function seedTripEvents(booking: Booking): TripStatusEvent[] {
  const reached = stageIndex(booking.status);
  if (reached < 0) return [];

  const pickup = new Date(booking.scheduled_at).getTime();
  const stages = TRIP_STAGE_ORDER.slice(0, reached + 1).filter((s) => s !== 'pending');

  return stages.map((status, i) => ({
    status,
    note: null,
    // Evenly spaced across the four hours before pickup — enough to order the
    // list correctly without implying a precision the demo does not have.
    created_at: new Date(pickup - (stages.length - i) * 48 * 60_000).toISOString(),
  }));
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

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
 * It is a stand-in for a backend that does not exist in this environment: the
 * API is a local placeholder (`http://localhost:4000`), nothing is deployed, and
 * the website turns out to make no network calls at all. A deployed demo cannot
 * reach any of that, so it carries its own data.
 *
 * It is NOT invented pricing. Every rate below is copied from the backend's own
 * `db/seed.sql`, and every fare on screen is computed from those rates by the
 * real `calculateFarePreview()` — the same function the booking flow uses and
 * the same arithmetic the backend mirrors. No figure in this file is a typed-in
 * price, and no component contains one either.
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
  phone: '+1 (310) 555-0148',
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

export const DEMO_SAVED_LOCATIONS: SavedLocation[] = [
  { id: 'demo-loc-home', label: 'Home', address: '1240 Hillcrest Rd, Beverly Hills, CA', lat: 34.0836, lng: -118.4076 },
  { id: 'demo-loc-office', label: 'Northline HQ', address: '400 S Hope St, Los Angeles, CA', lat: 34.0519, lng: -118.2542 },
  { id: 'demo-loc-lax', label: 'LAX Terminal 7', address: '380 World Way, Los Angeles, CA', lat: 33.9456, lng: -118.4011 },
];

export const DEMO_RECENT_LOCATIONS: SavedLocation[] = [
  { id: 'demo-recent-1', label: 'Chateau Marmont', address: '8221 Sunset Blvd, Los Angeles, CA', lat: 34.0977, lng: -118.3703 },
  { id: 'demo-recent-2', label: 'Santa Monica Pier', address: '200 Santa Monica Pier, Santa Monica, CA', lat: 34.0094, lng: -118.4973 },
];

export const DEMO_SAVED_PASSENGERS: SavedPassenger[] = [
  { id: 'demo-pax-1', full_name: 'Priya Raman', phone: '+1 (310) 555-0192', email: 'p.raman@northline.co' },
  { id: 'demo-pax-2', full_name: 'Tomas Lindqvist', phone: '+1 (424) 555-0117', email: null },
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
      distanceMiles: 18.4,
      pickup: '1240 Hillcrest Rd, Beverly Hills, CA',
      dropoff: 'LAX Terminal 7, Los Angeles, CA',
    }),
    makeBooking({
      id: 'demo-booking-past-1',
      vehicle: sedan,
      status: 'completed',
      scheduledAt: new Date(now.getTime() - 8 * 24 * HOURS),
      distanceMiles: 18.4,
      pickup: '1240 Hillcrest Rd, Beverly Hills, CA',
      dropoff: 'LAX Terminal 7, Los Angeles, CA',
    }),
    makeBooking({
      id: 'demo-booking-past-2',
      vehicle: suv,
      status: 'completed',
      scheduledAt: new Date(now.getTime() - 21 * 24 * HOURS),
      distanceMiles: 12.1,
      pickup: '400 S Hope St, Los Angeles, CA',
      dropoff: 'Chateau Marmont, 8221 Sunset Blvd',
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

/**
 * Types mirrored from lct-universal-backend's repository/route response
 * shapes. Duplicated rather than imported from a shared package because
 * the backend and this app are deliberately separate repositories with
 * separate deploy pipelines (per the project's own scope decisions) — if
 * that changes later, these are the types to extract into a shared
 * `@lct-universal/api-types` package.
 */

export type UserRole = 'customer' | 'driver' | 'admin' | 'corporate_admin';
export type CorporateRole = 'employee' | 'manager' | 'admin';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  corporate_account_id: string | null;
  corporate_role: CorporateRole | null;
  created_at: string;
  updated_at: string;
}

export type VehicleType = 'executive_sedan' | 'suv' | 'sprinter' | 'coach';

export interface Vehicle {
  id: string;
  type: VehicleType;
  name: string;
  description: string | null;
  capacity_passengers: number;
  capacity_luggage: number;
  base_rate: string;
  per_mile_rate: string;
  per_hour_rate: string | null;
  image_url: string | null;
  is_active: boolean;
  /*
   * Verified against a live `GET /vehicles`, not inferred: the endpoint returns
   * these four and this interface declared none of them.
   *
   * `license_plate` and `color` are migration 0022's columns. They are NULL on
   * every row today, because `vehicles` is a fare-class table and 0022's own
   * comment says as much — but a type that cannot see a field it is waiting for
   * is a trap for whoever eventually populates it. `describeVehicle()` in
   * `src/lib/vehicleIdentity.ts` starts using them the moment they are non-null,
   * with no screen changes. See BACKEND_FOLLOWUPS.md §1.
   */
  license_plate: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export type ServiceType = 'airport' | 'corporate' | 'events' | 'point_to_point' | 'hourly' | 'custom';

export interface Booking {
  id: string;
  profile_id: string;
  corporate_account_id: string | null;
  service_type: ServiceType;
  vehicle_id: string;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  scheduled_at: string;
  hourly_duration_hours: number | null;
  passenger_count: number;
  luggage_count: number;
  primary_passenger_name: string | null;
  primary_passenger_phone: string | null;
  special_requests: string | null;
  flight_number: string | null;
  status: import('../lib/tripStatus').TripStatus;
  approval_status: 'auto_approved' | 'pending_approval' | 'approved' | 'rejected';
  /*
   * THE FARE, AS THE SERVER COMPUTED IT.
   *
   * Every one of these is `numeric(10,2)` in Postgres and arrives as a STRING
   * through `pg` — not a rounding artefact to be tidied away, but the reason
   * the app must never do arithmetic on them without an explicit `Number()`.
   *
   * `waiting_fare`, `extra_stops_fare` and `discount_amount` were missing from
   * this interface while the API had been returning them since migration 0015
   * (`db/migrations/0015_booking_pricing_extensions.sql`, and the repository
   * selects `*`). Adding them is a type catching up with a response, not a new
   * API surface — nothing on the backend changes.
   *
   * They matter because the client's `calculateFarePreview()` cannot compute
   * any of the three: it has no concept of waiting time, extra stops, or a
   * promo code it never sees. A booking carrying any of them is charged a
   * different number from the breakdown the preview produced. The honest
   * interface is to display the server's line, never to approximate it.
   */
  base_fare: string;
  distance_miles: string | null;
  distance_fare: string;
  time_fare: string;
  surcharges: string;
  /** Driver waiting time beyond the grace period, at the server's per-minute rate. */
  waiting_fare: string;
  /** Flat fee per additional stop beyond the single pickup/drop-off. */
  extra_stops_fare: string;
  /** Promo-code discount, applied to the subtotal BEFORE gratuity and tax. */
  discount_amount: string;
  gratuity: string;
  tax: string;
  total_fare: string;
  currency: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

export interface Trip {
  id: string;
  booking_id: string;
  driver_id: string | null;
  vehicle_id: string;
  status: import('../lib/tripStatus').TripStatus;
  driver_current_lat: number | null;
  driver_current_lng: number | null;
  driver_location_updated_at: string | null;
  eta_minutes: number | null;
  picked_up_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

export interface TripStatusEvent {
  status: import('../lib/tripStatus').TripStatus;
  note: string | null;
  created_at: string;
}

export interface TripDriverInfo {
  id: string;
  full_name: string;
  avatar_url: string | null;
  rating: string | null;
}

export interface TripVehicleInfo {
  name: string;
  type: string;
}

export interface SavedPassenger {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
}

export interface SavedLocation {
  id: string;
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

export interface PaymentMethodRecord {
  id: string;
  stripe_payment_method_id: string;
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean;
}

export type NotificationType =
  | 'booking_confirmed'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'trip_started'
  | 'trip_completed'
  | 'trip_cancelled'
  | 'trip_reminder'
  | 'payment_receipt'
  | 'invoice_ready';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface CorporateAccount {
  id: string;
  company_name: string;
  billing_email: string;
  billing_address: string | null;
  requires_ride_approval: boolean;
  monthly_spend_limit: string | null;
}

export interface DriverTripRow {
  trip_id: string;
  booking_id: string;
  status: import('../lib/tripStatus').TripStatus;
  scheduled_at: string;
  pickup_address: string;
  dropoff_address: string | null;
  passenger_count: number;
  primary_passenger_name: string | null;
  primary_passenger_phone: string | null;
  total_fare: string;
}

export interface ParsedBookingIntent {
  serviceType: ServiceType | null;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  scheduledAtDescription: string | null;
  passengerCount: number | null;
  missingFields: string[];
  assistantReply: string;
}

import type { Booking } from '../types/api';
import type { BookingDraft } from '../store/bookingFormStore';

/**
 * The booking-form patch for "book this journey again".
 *
 * ── Why this is a shared function and not two copies ───────────────────────
 * Home has offered "Book again" since the redesign; the Journeys screen now
 * offers it too. Two copies of this mapping would drift the moment a field is
 * added to `BookingDraft` — one screen would carry the passenger count forward
 * and the other would silently drop it, and nobody would notice because both
 * screens would still work.
 *
 * ── What it deliberately does NOT carry ────────────────────────────────────
 * **The date, the vehicle and the fare.** A repeated journey is the same route,
 * not the same ride:
 *
 *   - `scheduledAt` is left null so the customer picks a new time. Copying the
 *     old one would put a date in the past into the form.
 *   - `vehicle` and `allInFare` are left null so the car is chosen against a
 *     fresh quote. Carrying the old fare forward would show a price computed
 *     for a different day — the late-night surcharge alone can move it — and
 *     this app does not display a fare it cannot stand behind.
 *   - `distanceMiles`, `durationMinutes` and `routePolyline` are left null so
 *     the route is measured again rather than assumed unchanged.
 *
 * The caller is expected to `reset()` the draft first, so every field not named
 * here returns to its initial value rather than inheriting from whatever the
 * customer was last doing.
 */
export function rebookDraftFrom(booking: Booking): Partial<BookingDraft> {
  return {
    serviceType: booking.service_type,
    pickupAddress: booking.pickup_address,
    pickupLat: booking.pickup_lat ?? undefined,
    pickupLng: booking.pickup_lng ?? undefined,
    dropoffAddress: booking.dropoff_address ?? '',
    dropoffLat: booking.dropoff_lat ?? undefined,
    dropoffLng: booking.dropoff_lng ?? undefined,
    passengerCount: booking.passenger_count,
    luggageCount: booking.luggage_count,
  };
}

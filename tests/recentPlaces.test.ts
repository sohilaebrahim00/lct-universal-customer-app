import { describe, expect, it } from '@jest/globals';
import { recentPlacesFrom } from '../src/lib/recentPlaces';
import type { Booking, SavedLocation } from '../src/types/api';

function booking(over: Partial<Booking>): Booking {
  return {
    id: 'b', profile_id: 'p', corporate_account_id: null, service_type: 'airport', vehicle_id: 'v',
    pickup_address: '4820 Maple Ave, Dallas, TX', pickup_lat: 32.8121, pickup_lng: -96.8175,
    dropoff_address: 'DFW Terminal D', dropoff_lat: 32.8969, dropoff_lng: -97.0381,
    scheduled_at: '2026-06-01T12:00:00.000Z', hourly_duration_hours: null, passenger_count: 1,
    luggage_count: 0, primary_passenger_name: null, primary_passenger_phone: null,
    special_requests: null, flight_number: null, status: 'completed', approval_status: 'auto_approved',
    base_fare: '65.00', distance_miles: '23.2', distance_fare: '75.40', time_fare: '0.00',
    surcharges: '0.00', waiting_fare: '0.00', extra_stops_fare: '0.00', discount_amount: '0.00',
    gratuity: '28.08', tax: '11.58', total_fare: '180.06', currency: 'usd',
    cancelled_at: null, cancellation_reason: null, created_at: '2026-05-01T00:00:00.000Z',
    ...over,
  };
}

describe('recentPlacesFrom', () => {
  it('takes both ends of a journey, most recent first', () => {
    const places = recentPlacesFrom([booking({ id: '1' })]);
    // A drop-off is as likely a future pickup as a pickup is — dropping them
    // would lose most airport runs.
    expect(places.map((p) => p.address)).toEqual(['4820 Maple Ave, Dallas, TX', 'DFW Terminal D']);
  });

  it('orders by the most recent booking, not by array order', () => {
    const places = recentPlacesFrom([
      booking({ id: 'old', scheduled_at: '2026-01-01T12:00:00.000Z', pickup_address: 'Older Ave', dropoff_address: null }),
      booking({ id: 'new', scheduled_at: '2026-08-01T12:00:00.000Z', pickup_address: 'Newer Ave', dropoff_address: null }),
    ]);
    expect(places.map((p) => p.address)).toEqual(['Newer Ave', 'Older Ave']);
  });

  it('de-duplicates the same place across bookings', () => {
    const places = recentPlacesFrom([booking({ id: '1' }), booking({ id: '2' })]);
    expect(places).toHaveLength(2);
  });

  it('treats casing and trailing punctuation as the same place', () => {
    // Two geocoder responses for one address must not become two rows.
    const places = recentPlacesFrom([
      booking({ id: '1', pickup_address: '4820 Maple Ave, Dallas, TX', dropoff_address: null }),
      booking({ id: '2', pickup_address: '4820 maple ave, dallas, tx.', dropoff_address: null }),
    ]);
    expect(places).toHaveLength(1);
  });

  it('never repeats an address already shown as saved', () => {
    const saved = [{ id: 's1', label: 'Home', address: '4820 MAPLE AVE, Dallas, TX', lat: 0, lng: 0 }] as SavedLocation[];
    const places = recentPlacesFrom([booking({ id: '1' })], { exclude: saved });
    expect(places.map((p) => p.address)).toEqual(['DFW Terminal D']);
  });

  it('honours the limit', () => {
    const places = recentPlacesFrom(
      [
        booking({ id: '1', pickup_address: 'A', dropoff_address: 'B' }),
        booking({ id: '2', pickup_address: 'C', dropoff_address: 'D' }),
      ],
      { limit: 3 },
    );
    expect(places).toHaveLength(3);
  });

  it('skips a booking with no drop-off rather than emitting an empty row', () => {
    const places = recentPlacesFrom([booking({ id: '1', dropoff_address: null })]);
    expect(places).toHaveLength(1);
  });

  it('carries coordinates through, including nulls from manual entry', () => {
    const places = recentPlacesFrom([booking({ id: '1', pickup_lat: null, pickup_lng: null, dropoff_address: null })]);
    expect(places[0]!.lat).toBeNull();
  });

  it('returns nothing for no bookings', () => {
    expect(recentPlacesFrom([])).toEqual([]);
  });
});

describe('recentPlacesFrom — the same place written two ways', () => {
  it('excludes a recent that is at a saved location, even with a different address string', () => {
    // Observed in the demo dataset: a saved "DFW Terminal D" stored as
    // "2337 S International Pkwy…" and a booking's "DFW Terminal D, DFW
    // Airport, TX" are one kerb and two strings. String matching alone listed
    // it under Saved AND Recent.
    const saved = [
      { id: 's', label: 'DFW Terminal D', address: '2337 S International Pkwy, DFW Airport, TX', lat: 32.8969, lng: -97.0381 },
    ] as SavedLocation[];
    const places = recentPlacesFrom(
      [booking({ id: '1', pickup_address: 'Somewhere Else', pickup_lat: 32.7, pickup_lng: -96.9 })],
      { exclude: saved },
    );
    expect(places.map((p) => p.address)).toEqual(['Somewhere Else']);
  });

  it('does not exclude a genuinely different address that happens to be nearby-ish', () => {
    // ~2 km away is a different place, and must survive.
    const saved = [
      { id: 's', label: 'DFW Terminal D', address: 'DFW Terminal D', lat: 32.8969, lng: -97.0381 },
    ] as SavedLocation[];
    const places = recentPlacesFrom(
      [booking({ id: '1', pickup_address: 'DFW Terminal A', pickup_lat: 32.9008, pickup_lng: -97.0362, dropoff_address: null })],
      { exclude: saved },
    );
    expect(places.map((p) => p.address)).toEqual(['DFW Terminal A']);
  });

  it('falls back to string matching when the recent has no coordinates', () => {
    const saved = [{ id: 's', label: 'Home', address: '4820 Maple Ave, Dallas, TX', lat: 32.8121, lng: -96.8175 }] as SavedLocation[];
    const places = recentPlacesFrom(
      [booking({ id: '1', pickup_address: '4820 Maple Ave, Dallas, TX', pickup_lat: null, pickup_lng: null, dropoff_address: null })],
      { exclude: saved },
    );
    expect(places).toEqual([]);
  });
});

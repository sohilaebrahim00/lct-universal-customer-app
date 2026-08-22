import { describe, expect, it } from '@jest/globals';
import { fareDiffers, serverFareFrom } from '../src/lib/serverFare';
import type { Booking } from '../src/types/api';

/**
 * The server's fare is the only number that gets charged, so the function that
 * reads it is worth pinning down — particularly the three lines the client
 * cannot compute, which is the whole reason this module exists.
 */

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    profile_id: 'p1',
    corporate_account_id: null,
    service_type: 'airport',
    vehicle_id: 'v1',
    pickup_address: '4820 Maple Ave, Dallas, TX',
    pickup_lat: null,
    pickup_lng: null,
    dropoff_address: 'DFW Terminal D',
    dropoff_lat: null,
    dropoff_lng: null,
    scheduled_at: '2026-06-14T18:00:00.000Z',
    hourly_duration_hours: null,
    passenger_count: 2,
    luggage_count: 2,
    primary_passenger_name: null,
    primary_passenger_phone: null,
    special_requests: null,
    flight_number: null,
    status: 'confirmed',
    approval_status: 'auto_approved',
    base_fare: '65.00',
    distance_miles: '23.2',
    distance_fare: '75.40',
    time_fare: '0.00',
    surcharges: '0.00',
    waiting_fare: '0.00',
    extra_stops_fare: '0.00',
    discount_amount: '0.00',
    gratuity: '28.08',
    tax: '11.58',
    total_fare: '180.06',
    currency: 'usd',
    cancelled_at: null,
    cancellation_reason: null,
    created_at: '2026-06-14T12:00:00.000Z',
    ...overrides,
  };
}

describe('serverFareFrom', () => {
  it('reads the total off the booking, as a number', () => {
    const fare = serverFareFrom(booking());
    expect(fare.total).toBe(180.06);
    expect(fare.currency).toBe('usd');
  });

  it('omits zero-valued lines rather than showing $0.00', () => {
    const labels = serverFareFrom(booking()).lines.map((l) => l.label);
    expect(labels).toEqual(['Base fare', 'Distance · 23.2 mi', 'Gratuity · 20%', 'Tax']);
    expect(labels).not.toContain('Waiting time');
    expect(labels).not.toContain('Late-night surcharge');
  });

  it('shows the late-night surcharge when the server applied one', () => {
    const labels = serverFareFrom(booking({ surcharges: '15.00' })).lines.map((l) => l.label);
    expect(labels).toContain('Late-night surcharge');
  });

  it('shows waiting time — a line the client preview cannot produce', () => {
    const fare = serverFareFrom(booking({ waiting_fare: '25.00' }));
    expect(fare.lines).toContainEqual({ label: 'Waiting time', amount: 25 });
  });

  it('shows additional stops — likewise', () => {
    const fare = serverFareFrom(booking({ extra_stops_fare: '20.00' }));
    expect(fare.lines).toContainEqual({ label: 'Additional stops', amount: 20 });
  });

  it('renders a discount as negative, because that is what it is', () => {
    const fare = serverFareFrom(booking({ discount_amount: '21.06', total_fare: '159.00' }));
    expect(fare.lines).toContainEqual({ label: 'Discount', amount: -21.06 });
    expect(fare.total).toBe(159);
  });

  it('drops the mileage from the distance label when the server has no distance', () => {
    const labels = serverFareFrom(booking({ distance_miles: null })).lines.map((l) => l.label);
    expect(labels).toContain('Distance');
    expect(labels).not.toContain('Distance · null mi');
  });

  it('shows an hourly booking its time line and no distance line', () => {
    const labels = serverFareFrom(
      booking({ service_type: 'hourly', distance_fare: '0.00', distance_miles: null, time_fare: '300.00' }),
    ).lines.map((l) => l.label);
    expect(labels).toContain('Time');
    expect(labels).not.toContain('Distance');
  });

  it('treats a missing or unparseable amount as zero rather than NaN', () => {
    // A field the API stopped sending must not put "$NaN" in front of a customer.
    const fare = serverFareFrom(booking({ waiting_fare: undefined as unknown as string, tax: 'oops' }));
    expect(fare.lines.find((l) => l.label === 'Tax')?.amount).toBe(0);
    expect(fare.lines.map((l) => l.label)).not.toContain('Waiting time');
  });
});

describe('fareDiffers', () => {
  it('is false when the two agree', () => {
    expect(fareDiffers(180.06, 180.06)).toBe(false);
  });

  it('is true for a single cent, in either direction', () => {
    // No tolerance band. A tolerance would be a decision about how much silent
    // overcharging is acceptable, and the answer to that is none.
    expect(fareDiffers(180.06, 180.07)).toBe(true);
    expect(fareDiffers(180.06, 180.05)).toBe(true);
  });

  it('does not fire on float representation noise', () => {
    // 0.1 + 0.2 === 0.30000000000000004. Comparing dollars as floats would
    // have shown an interstitial over an artefact.
    expect(fareDiffers(0.1 + 0.2, 0.3)).toBe(false);
  });

  it('catches the timezone divergence at its real magnitude', () => {
    // $15 surcharge plus gratuity and tax — the gap between a device in Dallas
    // and a server in UTC on an ordinary 19:00 pickup. See fareParity.test.ts.
    expect(fareDiffers(180.06, 199.3)).toBe(true);
  });
});

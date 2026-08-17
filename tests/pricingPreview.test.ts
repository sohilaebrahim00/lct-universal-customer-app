import { describe, expect, it } from '@jest/globals';
import { calculateFarePreview, GRATUITY_RATE, LATE_NIGHT_SURCHARGE, TAX_RATE } from '../src/lib/pricingPreview';

const sedan = { baseRate: 65, perMileRate: 3.25, perHourRate: 75 };
const DAYTIME = new Date('2026-06-15T14:00:00');
const LATE_NIGHT = new Date('2026-06-15T23:30:00');

const round2 = (value: number) => Math.round(value * 100) / 100;

describe('calculateFarePreview', () => {
  it('matches the backend algorithm for a distance-based fare', () => {
    const fare = calculateFarePreview({ vehicle: sedan, serviceType: 'point_to_point', distanceMiles: 20, scheduledAt: DAYTIME });
    const subtotal = 65 + 20 * 3.25;
    expect(fare.distanceFare).toBe(65);
    expect(fare.gratuity).toBe(round2(subtotal * GRATUITY_RATE));
    expect(fare.tax).toBe(round2(subtotal * TAX_RATE));
    expect(fare.totalFare).toBe(round2(subtotal + fare.gratuity + fare.tax));
  });

  it('uses time-based fare for hourly service, ignoring distance', () => {
    const fare = calculateFarePreview({ vehicle: sedan, serviceType: 'hourly', hourlyDurationHours: 3, distanceMiles: 999, scheduledAt: DAYTIME });
    expect(fare.timeFare).toBe(225);
    expect(fare.distanceFare).toBe(0);
  });

  it('applies the late-night surcharge', () => {
    const fare = calculateFarePreview({ vehicle: sedan, serviceType: 'point_to_point', distanceMiles: 10, scheduledAt: LATE_NIGHT });
    expect(fare.surcharges).toBe(LATE_NIGHT_SURCHARGE);
  });

  it('throws on hourly service with no duration', () => {
    expect(() => calculateFarePreview({ vehicle: sedan, serviceType: 'hourly', scheduledAt: DAYTIME })).toThrow(/hourlyDurationHours/);
  });

  it('throws on negative distance', () => {
    expect(() =>
      calculateFarePreview({ vehicle: sedan, serviceType: 'airport', distanceMiles: -1, scheduledAt: DAYTIME }),
    ).toThrow(/cannot be negative/);
  });
});

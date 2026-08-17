import type { ServiceType } from '../types/api';

/**
 * Mirrors lct-universal-backend/src/modules/bookings/pricing.ts exactly, so
 * the booking flow can show a live fare estimate as the customer picks a
 * vehicle/date without a network round-trip on every keystroke. The
 * backend recomputes this same calculation server-side on POST /bookings
 * and its result is authoritative — this is a preview only, never what
 * actually gets charged.
 */

export interface FareVehicleRates {
  baseRate: number;
  perMileRate: number;
  perHourRate: number | null;
}

export interface FareInput {
  vehicle: FareVehicleRates;
  serviceType: ServiceType;
  distanceMiles?: number | null;
  hourlyDurationHours?: number | null;
  scheduledAt: Date;
  gratuityRate?: number;
  taxRate?: number;
}

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surcharges: number;
  gratuity: number;
  tax: number;
  totalFare: number;
}

export const GRATUITY_RATE = 0.2;
export const TAX_RATE = 0.0825;
export const LATE_NIGHT_SURCHARGE = 15;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isLateNight(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 22 || hour < 5;
}

export function calculateFarePreview(input: FareInput): FareBreakdown {
  const { vehicle, serviceType, scheduledAt } = input;
  const gratuityRate = input.gratuityRate ?? GRATUITY_RATE;
  const taxRate = input.taxRate ?? TAX_RATE;

  if (vehicle.baseRate < 0 || vehicle.perMileRate < 0 || (vehicle.perHourRate ?? 0) < 0) {
    throw new RangeError('Vehicle rates must be non-negative');
  }

  let distanceFare = 0;
  let timeFare = 0;

  if (serviceType === 'hourly') {
    const hours = input.hourlyDurationHours ?? 0;
    if (hours <= 0) throw new RangeError('hourlyDurationHours must be greater than 0 for hourly service');
    if (!vehicle.perHourRate) throw new RangeError('Selected vehicle has no hourly rate configured');
    timeFare = vehicle.perHourRate * hours;
  } else {
    const distance = input.distanceMiles ?? 0;
    if (distance < 0) throw new RangeError('distanceMiles cannot be negative');
    distanceFare = vehicle.perMileRate * distance;
  }

  const surcharges = isLateNight(scheduledAt) ? LATE_NIGHT_SURCHARGE : 0;

  const subtotal = vehicle.baseRate + distanceFare + timeFare + surcharges;
  const gratuity = subtotal * gratuityRate;
  const tax = subtotal * taxRate;
  const totalFare = subtotal + gratuity + tax;

  return {
    baseFare: round2(vehicle.baseRate),
    distanceFare: round2(distanceFare),
    timeFare: round2(timeFare),
    surcharges: round2(surcharges),
    gratuity: round2(gratuity),
    tax: round2(tax),
    totalFare: round2(totalFare),
  };
}

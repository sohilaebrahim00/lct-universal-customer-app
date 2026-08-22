import type { TripDriverInfo, TripVehicleInfo } from '../types/api';

/**
 * Vehicle identification, assembled from whatever the API actually returns.
 *
 * ── Why this is its own module ──────────────────────────────────────────────
 * A rider has to be able to match what the app says to the car in front of them,
 * and a screen-reader user has to hear it as ONE utterance rather than as four
 * unlabelled text nodes. The documented failure in Uber's rider app is exactly
 * this: blind riders avoid rides because they cannot confirm the vehicle.
 *
 * ── The fields do not all exist yet ─────────────────────────────────────────
 * Verified against the backend itself, not the mirrored type: the trip-detail
 * join returns `select name, type from vehicles`, and `vehicles` is a fare-CLASS
 * table with no plate, colour, make or model. See BACKEND_FOLLOWUPS.md §1.
 *
 * So this builds the sentence from the parts that are present and simply omits
 * the ones that are not. No placeholder plate is ever printed. When the backend
 * gains the fields, they flow through here and every screen improves without a
 * single screen edit — which is the whole reason the assembly lives in one
 * function instead of being inlined per screen.
 */

/**
 * Fields the API may grow. Optional on purpose — see above. Kept here rather
 * than in `src/types/api.ts`, which mirrors what the backend returns TODAY and
 * must not be edited to describe a hoped-for shape.
 */
export interface VehicleIdentityExtras {
  plate?: string | null;
  colour?: string | null;
  make?: string | null;
  model?: string | null;
}

export interface VehicleIdentity {
  /** What the trip screen prints, e.g. "Black Mercedes S-Class" or just "Executive Sedan". */
  description: string;
  /** The plate, if the backend supplies one. Never invented. */
  plate: string | null;
  /** Whether the description names an actual car rather than a fare tier. */
  identifiesAPhysicalCar: boolean;
}

export function describeVehicle(
  vehicle: (TripVehicleInfo & VehicleIdentityExtras) | null,
): VehicleIdentity {
  if (!vehicle) {
    return { description: '', plate: null, identifiesAPhysicalCar: false };
  }

  const { colour, make, model, name } = vehicle;
  const specific = [colour, make, model].filter((part): part is string => Boolean(part && part.trim()));

  // "Black Mercedes S-Class" when we have the parts; otherwise the class name,
  // which identifies a price tier and not a car — hence the flag.
  const description = specific.length > 0 ? specific.join(' ') : name;

  return {
    description,
    plate: vehicle.plate?.trim() || null,
    identifiesAPhysicalCar: specific.length > 0,
  };
}

/**
 * The single string a screen reader announces for "which car is mine".
 *
 * Assembled as one sentence so VoiceOver reads it in one pass instead of
 * stopping between four separate nodes. Every clause is conditional; with only a
 * class name it degrades to "Your chauffeur Daniel A., Executive Sedan", which
 * is honest about what it can tell you.
 */
export function vehicleIdentityLabel(
  driver: TripDriverInfo | null,
  vehicle: (TripVehicleInfo & VehicleIdentityExtras) | null,
): string {
  const identity = describeVehicle(vehicle);
  const parts: string[] = [];

  if (driver?.full_name) parts.push(`Your chauffeur ${driver.full_name}`);
  if (identity.description) parts.push(identity.description);
  // "plate" spoken out loud, so the number is not read as a bare string of characters.
  if (identity.plate) parts.push(`plate ${identity.plate}`);

  return parts.join(', ');
}

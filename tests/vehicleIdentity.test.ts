import { describe, expect, it } from '@jest/globals';
import { describeVehicle, vehicleIdentityLabel } from '../src/lib/vehicleIdentity';
import type { TripDriverInfo, TripVehicleInfo } from '../src/types/api';

/**
 * "WHICH CAR IS MINE", AS ONE UTTERANCE.
 *
 * Uber's documented accessibility failure is that blind riders avoid rides
 * because they cannot reliably confirm which car is theirs. The chauffeur row
 * exists so a rider can match what the app says to the car in front of them —
 * and a screen-reader user has to hear that as ONE sentence, not four nodes
 * with pauses between them.
 *
 * These assertions pin the sentence's shape. What they cannot tell you is
 * whether it SOUNDS right when spoken — that needs VoiceOver on a device, and
 * it stays on the unverifiable list.
 *
 * The reason this matters now: `BACKEND_FOLLOWUPS.md` §1 means the fields for a
 * physical car do not exist yet, so the label degrades. It must degrade
 * HONESTLY — naming a price tier without implying it identifies a car.
 */

const driver: TripDriverInfo = { id: 'd', full_name: 'Daniel Alvarez', avatar_url: null, rating: null };
const sedan = { name: 'Executive Sedan', type: 'executive_sedan' } as TripVehicleInfo;

describe('describeVehicle', () => {
  it('prefers a physical description when the fields exist', () => {
    const identity = describeVehicle({ ...sedan, colour: 'Black', make: 'Mercedes-Benz', model: 'S-Class', plate: '8XKL294' });
    expect(identity.description).toBe('Black Mercedes-Benz S-Class');
    expect(identity.plate).toBe('8XKL294');
    expect(identity.identifiesAPhysicalCar).toBe(true);
  });

  it('falls back to the class name and SAYS it is not a car', () => {
    // The flag is the point. "Executive Sedan" identifies a price tier, and a
    // caller must be able to tell the difference without parsing the string.
    const identity = describeVehicle(sedan);
    expect(identity.description).toBe('Executive Sedan');
    expect(identity.identifiesAPhysicalCar).toBe(false);
  });

  it('builds a partial description from whatever parts arrive', () => {
    // The fields land incrementally — colour before make, or make without
    // model. Each must be usable on its own.
    expect(describeVehicle({ ...sedan, colour: 'Black' }).description).toBe('Black');
    expect(describeVehicle({ ...sedan, make: 'Mercedes-Benz', model: 'S-Class' }).description).toBe('Mercedes-Benz S-Class');
  });

  it('treats blank and whitespace-only fields as absent', () => {
    // A backend that returns '' rather than null must not produce
    // "Your chauffeur Daniel Alvarez,  , plate".
    const identity = describeVehicle({ ...sedan, colour: '   ', make: '', plate: '  ' });
    expect(identity.description).toBe('Executive Sedan');
    expect(identity.plate).toBeNull();
  });

  it('returns nothing at all for no vehicle', () => {
    expect(describeVehicle(null).description).toBe('');
    expect(describeVehicle(null).identifiesAPhysicalCar).toBe(false);
  });
});

describe('vehicleIdentityLabel — the single spoken sentence', () => {
  it('reads as one sentence when every field is present', () => {
    const label = vehicleIdentityLabel(driver, { ...sedan, colour: 'Black', make: 'Mercedes-Benz', model: 'S-Class', plate: '8XKL294' });
    expect(label).toBe('Your chauffeur Daniel Alvarez, Black Mercedes-Benz S-Class, plate 8XKL294');
  });

  it('says "plate" aloud so the number is not read as a bare character string', () => {
    const label = vehicleIdentityLabel(driver, { ...sedan, plate: '8XKL294' });
    expect(label).toContain('plate 8XKL294');
  });

  it('degrades to what is actually known — today, a chauffeur and a class', () => {
    // This is the label the app ACTUALLY produces right now, because
    // fleet_vehicles does not exist. It should read cleanly, with no dangling
    // commas and no gap where a plate would go.
    expect(vehicleIdentityLabel(driver, sedan)).toBe('Your chauffeur Daniel Alvarez, Executive Sedan');
  });

  it('handles a chauffeur with no vehicle, and a vehicle with no chauffeur', () => {
    expect(vehicleIdentityLabel(driver, null)).toBe('Your chauffeur Daniel Alvarez');
    expect(vehicleIdentityLabel(null, sedan)).toBe('Executive Sedan');
  });

  it('is empty rather than malformed when nothing is known', () => {
    // Before dispatch assigns anyone. An empty label is dropped by the caller;
    // a stray comma would be read aloud.
    expect(vehicleIdentityLabel(null, null)).toBe('');
  });

  it('never emits a dangling separator in any combination', () => {
    const combos = [
      vehicleIdentityLabel(driver, sedan),
      vehicleIdentityLabel(driver, { ...sedan, plate: 'ABC123' }),
      vehicleIdentityLabel(null, { ...sedan, colour: 'Black' }),
      vehicleIdentityLabel(driver, null),
      vehicleIdentityLabel(null, null),
    ];
    for (const label of combos) {
      expect(label).not.toMatch(/,\s*,/);
      expect(label.trim()).toBe(label);
      expect(label.endsWith(',')).toBe(false);
    }
  });
});

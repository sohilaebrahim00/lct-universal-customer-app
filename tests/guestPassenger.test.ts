import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * BOOKING FOR SOMEONE ELSE — the wiring, and the defect that hid under it.
 *
 * Every piece of this feature existed and nothing joined them: the model, both
 * API methods, the account screen, the two draft fields and the payload. What
 * was missing was a screen that WROTE `primaryPassengerName`, so every booking
 * was silently for the account holder and the chauffeur's name sign fell back
 * to the payer.
 *
 * ── The defect the selector uncovered ─────────────────────────────────────
 * `demoApi`'s `POST /bookings` builds the new booking by spreading a TEMPLATE
 * booking, and never read the passenger fields from the request. So the first
 * guest booking would have stored the template's passenger — the wrong person's
 * name, on the sign a chauffeur holds up at a kerb. It was invisible until
 * something wrote the field, because nothing ever had.
 *
 * These assertions are on the SOURCE, in the shape `observedRateCardContainment`
 * uses, because the failure is one nobody would notice by looking: the booking
 * still succeeds, it is just for the wrong person.
 */

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');

const DEMO_API = read('src/dev/demoApi.ts');
const STORE = read('src/store/bookingFormStore.ts');
const SELECTOR = read('src/components/booking/PassengerSelector.tsx');
const DETAILS = read('app/(app)/book/details.tsx');
const ROLE_DATA = read('src/dev/role/roleData.ts');

describe('the passenger reaches the booking', () => {
  it('is written by a screen — the connection that was missing', () => {
    expect(DETAILS).toContain('PassengerSelector');
    expect(DETAILS).toMatch(/primaryPassengerName/);
  });

  it('is sent on the create-booking payload', () => {
    expect(STORE).toMatch(/primaryPassengerName:\s*draft\.primaryPassengerName/);
    expect(STORE).toMatch(/primaryPassengerPhone:\s*draft\.primaryPassengerPhone/);
  });

  /*
   * THE REGRESSION GUARD.
   *
   * Four fields the template spread was silently overwriting. If any of these
   * mappings is removed, a booking keeps succeeding and quietly carries someone
   * else's passenger, notes and flight — so the check is on their presence.
   */
  it('is stored by the demo layer rather than inherited from the template', () => {
    for (const field of [
      'primary_passenger_name',
      'primary_passenger_phone',
      'special_requests',
      'flight_number',
    ]) {
      expect(DEMO_API).toMatch(new RegExp(`${field}:\\s*\\(input\\.`));
    }
  });

  it('falls back to NULL, never to the template, when there is no guest', () => {
    // `?? template.x` would give a booking-for-yourself a stranger's name.
    expect(DEMO_API).not.toMatch(/primary_passenger_name:.*template\./);
    expect(DEMO_API).toMatch(/primary_passenger_name:.*\?\?\s*null/);
  });
});

describe('the chauffeur sign uses the traveller, not the payer', () => {
  it('prefers the booking passenger and falls back to the customer', () => {
    // Both name-sign helpers read the passenger FIRST. Reversing these two
    // would put the payer's name on the sign for every guest booking.
    const lines = ROLE_DATA.split('\n').filter((l) => l.includes('primary_passenger_name'));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      if (!line.includes('??')) continue;
      expect(line.indexOf('primary_passenger_name')).toBeLessThan(line.indexOf('full_name'));
    }
  });
});

describe('what the selector must not promise', () => {
  /*
   * The competitor's sheet says "we'll keep them informed every step of the
   * way". There is no passenger-level notification routing in this project, so
   * that sentence would be a promise the product cannot keep — made at the
   * moment a customer decides to trust it with someone else's journey.
   */
  it('does not claim the passenger will be notified', () => {
    const code = SELECTOR.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/keep them informed/i);
    expect(code).not.toMatch(/we('| wi)ll (text|message|notify) (them|the passenger)/i);
  });

  it('states who actually receives trip updates', () => {
    expect(SELECTOR).toMatch(/account holder/i);
  });

  it('reuses the one passenger API rather than adding a second store', () => {
    expect(SELECTOR).toContain('profilesApi.savedPassengers');
    expect(SELECTOR).toContain('profilesApi.addSavedPassenger');
    // No parallel persistence — the account screen and this must agree.
    expect(SELECTOR).not.toMatch(/AsyncStorage|localStorage/);
  });
});

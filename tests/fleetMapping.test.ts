import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLISHED_NAMES_BY_PAGE } from '../src/config/publishedFleet';

/**
 * THE FLEET, AFTER THE 2026-09-10 IMAGE SUPPLY.
 *
 * The client supplied seven images and asked for seven customer-facing classes.
 * **Four of those seven have no rate card**, so they are not created here — a
 * "From $130" starting label is not the base / per-mile / per-hour triple the
 * fare engine needs, and inventing one would price a real booking from a guess.
 *
 * What these assertions protect is the part that IS settled: which vehicle each
 * existing class shows, that no class shows another operator's livery, and that
 * the four class IDs did not move.
 */

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');
const IMAGES = read('src/lib/vehicleImages.ts');
const DEMO = read('src/dev/demoData.ts');
const API = read('src/types/api.ts');

describe('class IDs are stable', () => {
  /*
   * §8 of the delivery brief, and the standing rule that this repository does
   * not change API contracts. Bookings, dispatch, stored trips and the fare
   * engine all key on these four strings.
   */
  it('still declares exactly the four VehicleType values', () => {
    const line = /export type VehicleType =([^;]+);/.exec(API)![1]!;
    const ids = [...line.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(ids).toEqual(['executive_sedan', 'suv', 'sprinter', 'coach']);
  });
});

describe('every class shows the vehicle its own row names', () => {
  it('suv shows an Escalade, which is what its description says', () => {
    const row = (DEMO.split("id: 'demo-vehicle-suv'")[1] ?? '').split('},')[0]!;
    expect(row).toContain('Cadillac Escalade or equivalent');
    expect(IMAGES).toMatch(/suv: require\([^)]*escalade[^)]*\)/i);
  });

  it('sprinter shows a Sprinter', () => {
    expect(IMAGES).toMatch(/sprinter: require\([^)]*sprinter[^)]*\)/i);
  });

  it('coach shows the motor coach', () => {
    expect(IMAGES).toMatch(/coach: require\([^)]*coach[^)]*\)/i);
  });
});

describe('no other operator’s livery reaches a customer', () => {
  /*
   * The held Escalade photographs carried a LuxLane Transports plate, phone
   * number, web address and a scannable QR code. The client's 2026-09-10 supply
   * resolved that by providing clean imagery. Nothing named for the other
   * operator may be referenced from customer-facing config.
   */
  /*
   * Scoped to the REQUIRE PATHS, not to the file's prose.
   *
   * The first version forbade the word "LuxLane" anywhere in the module, and
   * failed on the comment that explains why the class was held and how the hold
   * was resolved. That is a check that cannot tell a reference from a
   * description — the same shape this project keeps removing from its gates.
   * What must not ship is an ASSET; the history is exactly what should stay.
   */
  it('references no asset carrying another operator’s branding', () => {
    const requires = [...IMAGES.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1]!.toLowerCase());
    expect(requires.length).toBeGreaterThan(0);
    for (const path of requires) {
      expect(path).not.toMatch(/luxlane|escalade-rear|fleet-escalade|suv-escalade-corporate/);
    }
  });

  it('references no asset that is gone', () => {
    // The three superseded files were deleted, not orphaned. `vehicleImages`
    // has its own on-disk check; this guards the specific names.
    for (const stale of ['luxury-suv.jpg', 'sprinter-passenger.jpg', 'coach.jpg']) {
      expect(IMAGES).not.toContain(`vehicles/${stale}`);
    }
  });
});

describe('the Sprinter capacity change, and the source it came from', () => {
  /*
   * 13 is the client's own figure, supplied 2026-09-10. It CONTRADICTS the
   * published /rates page, which said 14 on 2026-08-26 — recorded in the row's
   * comment rather than reconciled silently.
   */
  it('carries 13 passengers, and luggage is not a copy of that number', () => {
    const row = (DEMO.split("id: 'demo-vehicle-sprinter'")[1] ?? '').split('},')[0]!;
    expect(row).toContain('capacity_passengers: 13');
    expect(row).toContain('capacity_luggage: 10');
    // §11: luggage is never inferred from passengers. The row used to read
    // 14/14, which was exactly that inference.
    expect(row).not.toMatch(/capacity_luggage: 13/);
  });

  it('and the description agrees with the number', () => {
    const row = (DEMO.split("id: 'demo-vehicle-sprinter'")[1] ?? '').split('},')[0]!;
    expect(row).toContain('up to 13 passengers');
    expect(row).not.toContain('up to 14 passengers');
  });

  it('is named what BOTH published pages and the client call it', () => {
    const published = PUBLISHED_NAMES_BY_PAGE.classes.find((c) => c.appType === 'sprinter')!;
    expect(published.fleet).toBe('Executive Sprinter');
    expect(published.rates).toBe('Executive Sprinter');
    const row = (DEMO.split("id: 'demo-vehicle-sprinter'")[1] ?? '').split('},')[0]!;
    expect(row).toContain("name: 'Executive Sprinter'");
  });
});

describe('the four classes that were NOT created, and why', () => {
  /*
   * Luxury SUV, First Class, Mini Bus and a split Motor Coach were requested.
   * None has a rate card. This asserts that no one has since added a priced row
   * for them without the rates arriving first — the failure would be a real
   * booking quoted from an invented number.
   */
  it('has not gained a priced row for a class with no published rate card', () => {
    for (const absent of ['demo-vehicle-luxury-suv', 'demo-vehicle-first-class', 'demo-vehicle-mini-bus']) {
      expect(DEMO).not.toContain(absent);
    }
  });

  it('still records the two classes the site publishes but the app cannot price', () => {
    // Luxury SUV (From $130) and First Class Sedan ($150/hour) are published
    // with `appType: null` — a starting label, not a rate card.
    const unpriced = PUBLISHED_NAMES_BY_PAGE.classes.filter((c) => c.appType === null);
    expect(unpriced.map((c) => c.fleet)).toEqual(['Luxury SUV', 'First Class Sedan']);
  });
});

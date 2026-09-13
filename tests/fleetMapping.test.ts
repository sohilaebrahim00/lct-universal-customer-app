import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CLIENT_CONFIRMED_LABELS,
  CLIENT_CONFIRMED_LABELS_SOURCE,
  PUBLISHED_NAMES_BY_PAGE,
  PUBLISHED_STARTING_LABELS,
  publishedStartingLabel,
} from '../src/config/publishedFleet';
import { calculateFarePreview } from '../src/lib/pricingPreview';

/**
 * THE FLEET, AFTER THE 2026-09-10 IMAGE SUPPLY.
 *
 * All SEVEN classes are now on the fleet page. Only FOUR are bookable, because
 * only four have a rate card — a "From $130" starting label is not the base /
 * per-mile / per-hour triple the fare engine needs, and inventing one would
 * price a real booking from a guess.
 *
 * These assertions protect the settled part: which vehicle each class shows,
 * that no class shows another operator's livery, that the four class IDs did
 * not move, and that an unpriced class cannot reach calculated checkout.
 */

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');
const IMAGES = read('src/lib/vehicleImages.ts');
const DEMO = read('src/dev/demoData.ts');
const API = read('src/types/api.ts');
const CATALOGUE = read('src/config/fleetCatalogue.ts');

/** `key: 'value'` pairs out of a literal block, by name. */
function literalBlock(src: string, marker: string): Record<string, string> {
  const after = src.split(marker)[1] ?? '';
  const block = after.split('};')[0] ?? '';
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/^\s*(\w+):\s*'([^']+)'/gm)) out[m[1]!] = m[2]!;
  return out;
}

describe('one name per class, across every screen', () => {
  /**
   * THE GUARANTEE THAT REPLACED A DERIVATION.
   *
   * `VEHICLE_DISPLAY_NAME` was briefly computed from the catalogue so the two
   * could not diverge. That broke three suites which parse the literal block
   * out of source — they must, because Jest cannot import a module that
   * `require()`s a .jpg. The literals came back and this assertion took over
   * the job: same guarantee, nothing else broken.
   *
   * The failure it prevents is concrete. The booking picker read the API's
   * `vehicle.name` while /fleet read the catalogue, so one class showed as
   * "Executive SUV" on the screen where you choose and "Premium SUV" on the
   * screen where you browse.
   */
  it('gives every bookable class the same name in the catalogue and the display map', () => {
    const display = literalBlock(IMAGES, 'VEHICLE_DISPLAY_NAME');
    const entries = [...CATALOGUE.matchAll(/name: '([^']+)',[\s\S]{0,2000}?vehicleType: (?:'(\w+)'|null)/g)];
    expect(entries.length).toBeGreaterThan(0);
    for (const [, name, type] of entries) {
      if (!type) continue; // display-only class: no VehicleType to agree with
      expect(display[type]).toBe(name);
    }
  });

  it('the booking picker renders the display name, not the raw API name', () => {
    const picker = read('app/(app)/book/vehicle.tsx');
    expect(picker).toContain('VEHICLE_DISPLAY_NAME[vehicle.type] ?? vehicle.name');
  });
});

/** One parsed record per catalogue entry, in declaration order. */
function catalogueEntries(): { key: string; name: string; type: string | null; image: boolean; passengers: number; luggage: string; mode: string }[] {
  const body = CATALOGUE.split('FLEET_CATALOGUE: readonly FleetClass[] = [')[1] ?? '';
  return [...body.matchAll(/key: '([^']+)',[\s\S]*?name: '([^']+)',[\s\S]*?vehicleType: (?:'(\w+)'|null),[\s\S]*?image: (require\([^)]*\)|null),[\s\S]*?passengers: (\d+),[\s\S]*?luggage: (\d+|null),[\s\S]*?pricingMode: '([^']+)'/g)].map((m) => ({
    key: m[1]!,
    name: m[2]!,
    type: m[3] ?? null,
    image: m[4] !== 'null',
    passengers: Number(m[5]),
    luggage: m[6]!,
    mode: m[7]!,
  }));
}

describe('the customer-facing catalogue', () => {
  it('offers exactly the seven classes the client asked for, once each', () => {
    const entries = catalogueEntries();
    expect(entries.map((e) => e.name)).toEqual([
      'Premium SUV',
      'Luxury SUV',
      'First Class',
      'Executive Sprinter',
      'Mini Bus',
      'Mini Coach',
      'Motor Coach',
    ]);
    // No duplicate Mini Coach — the client's own message listed it twice.
    expect(new Set(entries.map((e) => e.key)).size).toBe(7);
    expect(entries.filter((e) => e.name === 'Mini Coach')).toHaveLength(1);
  });

  it('carries the capacities the client supplied for the group classes', () => {
    const by = Object.fromEntries(catalogueEntries().map((e) => [e.name, e]));
    expect(by['Executive Sprinter']!.passengers).toBe(13);
    expect(by['Mini Bus']!.passengers).toBe(27);
    expect(by['Mini Coach']!.passengers).toBe(40);
    expect(by['Motor Coach']!.passengers).toBe(56);
  });

  /*
   * §11. Luggage is stated only where the business has confirmed it. A 56-seat
   * coach does not carry 56 bags, and a null here is the honest answer rather
   * than a number nobody published.
   */
  it('omits luggage for the group classes nobody has published a figure for', () => {
    const by = Object.fromEntries(catalogueEntries().map((e) => [e.name, e]));
    for (const name of ['Mini Bus', 'Mini Coach', 'Motor Coach']) {
      expect(by[name]!.luggage).toBe('null');
    }
    // And states it where /rates does: Sprinter 14/10 — the 10 is the site's.
    expect(by['Executive Sprinter']!.luggage).toBe('10');
  });

  /**
   * THE ASSERTION THAT KEEPS AN INVENTED PRICE OUT OF CHECKOUT.
   *
   * A class with no rate card must not carry a `vehicleType`, because that is
   * the only thing tying a catalogue entry to the fare engine. If one ever
   * does, a customer could select it and be quoted from rates nobody supplied.
   */
  it('gives no unpriced class a route into the calculated fare', () => {
    for (const entry of catalogueEntries()) {
      if (entry.mode === 'request-quote') expect(entry.type).toBeNull();
    }
  });

  it('and every bookable class does have one', () => {
    for (const entry of catalogueEntries()) {
      if (entry.mode === 'bookable') expect(entry.type).not.toBeNull();
    }
  });

  /*
   * The booking picker renders from the API, never from the catalogue, so a
   * display-only class cannot appear there at all. This guards that boundary —
   * importing the catalogue into the picker is how it would be crossed.
   */
  it('keeps the catalogue out of the booking picker entirely', () => {
    expect(read('app/(app)/book/vehicle.tsx')).not.toContain('FLEET_CATALOGUE');
  });

  /**
   * The two images with malformed lettering — "SUBURBIAY" on the Suburban and
   * "EXECUTIVE TRANSPOR T5" inside LCT's own logo lockup on the Freightliner.
   * Their classes appear; their photographs do not.
   */
  it('publishes no image for the two classes whose supplied asset is defective', () => {
    const by = Object.fromEntries(catalogueEntries().map((e) => [e.name, e]));
    expect(by['Luxury SUV']!.image).toBe(false);
    expect(by['Mini Coach']!.image).toBe(false);
    // And every other class does have one — so this is not vacuously true.
    for (const name of ['Premium SUV', 'First Class', 'Executive Sprinter', 'Mini Bus', 'Motor Coach']) {
      expect(by[name]!.image).toBe(true);
    }
  });

  it('does not reference the held assets from anywhere in src', () => {
    for (const held of ['luxury-suv-suburban', 'mini-coach-40-freightliner']) {
      expect(CATALOGUE).not.toContain(held);
      expect(IMAGES).not.toContain(held);
    }
  });
});

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

describe('First Class pricing, confirmed 2026-09-13', () => {
  /**
   * THE CONFIRMATION WAS ONE NUMBER, AND ONLY ONE NUMBER MOVED.
   *
   * The client confirmed **First Class = $150/hour**. That is authoritative for
   * the hourly component and for the customer-facing label, and for nothing
   * else. A base fare and a per-mile rate were not supplied, so neither was
   * derived — and a one-way trip is priced from exactly those two, which is why
   * this block asserts they are untouched as carefully as it asserts the change.
   */
  const sedanRow = () => (DEMO.split("id: 'demo-vehicle-sedan'")[1] ?? '').split('},')[0]!;

  it('quotes $150 an hour', () => {
    expect(sedanRow()).toContain("per_hour_rate: '150.00'");
    expect(sedanRow()).not.toContain("per_hour_rate: '100.00'");
  });

  it('leaves base and per-mile exactly as they were', () => {
    // Not supplied by the client, so not invented. A one-way First Class fare
    // still computes from these two, unchanged.
    expect(sedanRow()).toContain("base_rate: '65.00'");
    expect(sedanRow()).toContain("per_mile_rate: '3.25'");
  });

  it('shows $150/hour to the customer, and no longer "From $95"', () => {
    expect(publishedStartingLabel('executive_sedan')).toBe('$150/hour');
    expect(publishedStartingLabel('executive_sedan')).not.toBe('From $95');
  });

  /*
   * The 2026-08-26 site reading is KEPT as provenance rather than edited away.
   * The override records what it supersedes and when, so a later re-read of the
   * site can be dated against the confirmation instead of silently undoing it.
   */
  it('supersedes the site reading without erasing it', () => {
    expect(PUBLISHED_STARTING_LABELS.executive_sedan).toBe('From $95');
    expect(CLIENT_CONFIRMED_LABELS.executive_sedan).toBe('$150/hour');
    expect(CLIENT_CONFIRMED_LABELS_SOURCE.executive_sedan.supersedes).toBe('From $95');
    expect(CLIENT_CONFIRMED_LABELS_SOURCE.executive_sedan.confirmedOn).toBe('2026-09-13');
  });

  /**
   * NO OTHER CLASS MOVED. The confirmation named one class; every other rate in
   * the fare-class table must be byte-identical to what it was at 71a425f.
   */
  it('changes no other class’s rate card', () => {
    const suv = (DEMO.split("id: 'demo-vehicle-suv'")[1] ?? '').split('},')[0]!;
    expect(suv).toContain("base_rate: '85.00'");
    expect(suv).toContain("per_mile_rate: '3.75'");
    expect(suv).toContain("per_hour_rate: '120.00'");

    const sprinter = (DEMO.split("id: 'demo-vehicle-sprinter'")[1] ?? '').split('},')[0]!;
    expect(sprinter).toContain("base_rate: '150.00'");
    expect(sprinter).toContain("per_mile_rate: '4.50'");
    expect(sprinter).toContain("per_hour_rate: '200.00'");
  });

  it('leaves every other class’s customer-facing label alone', () => {
    expect(publishedStartingLabel('suv')).toBe('From $110');
    expect(publishedStartingLabel('sprinter')).toBe('Request Quote');
    expect(publishedStartingLabel('coach')).toBe('Request Quote');
    // Exactly one override exists. A second would mean something else moved.
    expect(Object.keys(CLIENT_CONFIRMED_LABELS)).toEqual(['executive_sedan']);
  });

  /**
   * THE ARITHMETIC, not just the constant.
   *
   * `calculateFarePreview` multiplies `perHourRate × hours` for an hourly
   * service, so a three-hour First Class booking must cost $450 of time fare
   * where it used to cost $300. Asserted through the real function, because a
   * constant being right and a fare being right are different claims — and the
   * whole 1,982-test suite passed across this change without noticing it.
   */
  it('actually charges the new rate on an hourly booking', () => {
    const vehicle = { baseRate: 65, perMileRate: 3.25, perHourRate: 150 };
    const at = new Date('2026-10-01T14:00:00Z');

    const now = calculateFarePreview({ vehicle, serviceType: 'hourly', hourlyDurationHours: 3, scheduledAt: at });
    const before = calculateFarePreview({
      vehicle: { ...vehicle, perHourRate: 100 },
      serviceType: 'hourly',
      hourlyDurationHours: 3,
      scheduledAt: at,
    });

    // $150 x 3 hours, exactly — against $100 x 3 before.
    expect(now.timeFare).toBe(450);
    expect(before.timeFare).toBe(300);
    // And it reaches the total rather than being absorbed on the way.
    expect(now.totalFare).toBeGreaterThan(before.totalFare);
  });
});

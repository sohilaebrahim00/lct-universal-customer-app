import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  PUBLISHED_STARTING_LABELS,
  WEBSITE_CLASSES_WITHOUT_BACKEND_EQUIVALENT,
} from '../src/config/publishedFleet';

/**
 * TWO CLASSES WITH THE SAME NAME MUST NOT CARRY DIFFERENT PRICES.
 *
 * ── The conflict this was written for ───────────────────────────────────────
 * `publishedFleet.ts` publishes **Luxury SUV — From $110** (the `suv` class,
 * whose display name comes from `VEHICLE_DISPLAY_NAME`) and separately records
 * **Luxury SUV — From $130** as a site class with no backend equivalent. One
 * name, two prices, in one file. Nobody would notice, because the two live in
 * different constants and neither is wrong on its own.
 *
 * ── Why this is not a permanently red test ──────────────────────────────────
 * The obvious move is to let it fail, so somebody has to resolve it
 * deliberately. Rejected, for two reasons:
 *
 *   1. This project's standing rule is green gates at all times. A suite that
 *      is red for a reason nobody in this repo can fix — it needs the business
 *      to say which figure is right — trains everyone to read red as normal,
 *      and the next real failure hides behind it.
 *   2. A red gate nobody can clear gets deleted or skipped within a week, and
 *      then the conflict is invisible again with no test to show for it.
 *
 * So the conflict is ENUMERATED instead. The test passes only while the set of
 * conflicts is exactly the one below. It goes red if a NEW duplicate-name
 * conflict appears — the case it was written to catch — and it also goes red
 * when this one is RESOLVED, which forces whoever fixes it to delete the
 * exemption on purpose rather than watch a test quietly start passing.
 *
 * That is the same shape as the observed-rate-card containment rule: name the
 * exception, so the default is coverage.
 */

/**
 * Display names, joined to the classes that carry a published figure.
 *
 * Parsed from `vehicleImages.ts` rather than imported, because that module
 * `require()`s four JPEGs which Metro resolves and Jest does not.
 */
function displayNames(): Record<string, string> {
  const source = readFileSync('src/lib/vehicleImages.ts', 'utf8');
  const afterName = source.split('VEHICLE_DISPLAY_NAME')[1] ?? '';
  const block = afterName.split('};')[0] ?? '';
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(\w+):\s*'([^']+)'/g)) {
    if (m[1] !== undefined && m[2] !== undefined) out[m[1]] = m[2];
  }
  return out;
}

interface PublishedEntry {
  displayName: string;
  figure: string;
  origin: string;
}

/** Every published (name, figure) pair the file carries, from both constants. */
function publishedEntries(): PublishedEntry[] {
  const names = displayNames();
  const entries: PublishedEntry[] = [];

  for (const [type, figure] of Object.entries(PUBLISHED_STARTING_LABELS)) {
    entries.push({
      displayName: names[type] ?? type,
      figure,
      origin: `PUBLISHED_STARTING_LABELS.${type}`,
    });
  }
  for (const c of WEBSITE_CLASSES_WITHOUT_BACKEND_EQUIVALENT) {
    entries.push({
      displayName: c.name,
      figure: c.priceLabel,
      origin: 'WEBSITE_CLASSES_WITHOUT_BACKEND_EQUIVALENT',
    });
  }
  return entries;
}

interface Conflict {
  displayName: string;
  figures: string[];
}

function conflicts(): Conflict[] {
  const byName = new Map<string, Set<string>>();
  for (const e of publishedEntries()) {
    const set = byName.get(e.displayName) ?? new Set<string>();
    set.add(e.figure);
    byName.set(e.displayName, set);
  }
  return [...byName.entries()]
    .filter(([, figures]) => figures.size > 1)
    .map(([displayName, figures]) => ({ displayName, figures: [...figures].sort() }));
}

/**
 * The one conflict known on 2026-08-23, awaiting a business answer.
 *
 * Recorded in `PLATFORM_RECONCILIATION.md` and `HANDOFF.md`. Owner: the
 * business — only they can say which figure a customer is charged against.
 *
 * **Delete this entry when the conflict is resolved.** The test will tell you
 * to: it fails when the actual conflicts stop matching this list.
 */
const KNOWN_CONFLICTS: Conflict[] = [{ displayName: 'Luxury SUV', figures: ['From $110', 'From $130'] }];

describe('published display names must not carry conflicting figures', () => {
  it('has exactly the known conflicts, and no others', () => {
    /*
     * Both directions matter. A NEW conflict is the defect this guards against.
     * A RESOLVED conflict must also fail, so the exemption above is removed
     * deliberately instead of rotting into a lie about the file.
     */
    expect(conflicts()).toEqual(KNOWN_CONFLICTS);
  });

  it('names the conflict loudly enough to act on', () => {
    // Not decoration: this is the assertion that the recorded conflict is the
    // real one, with the real figures, rather than a stale label.
    const luxurySuv = conflicts().find((c) => c.displayName === 'Luxury SUV');
    expect(luxurySuv).toBeDefined();
    expect(luxurySuv?.figures).toContain('From $110');
    expect(luxurySuv?.figures).toContain('From $130');
  });

  it('every published figure is either a From price or a quote request', () => {
    // A third format would be a fourth way to say a price, which is how the
    // app came to print "From $65.00" in the first place.
    for (const e of publishedEntries()) {
      expect(e.figure).toMatch(/^(From \$\d+|Request Quote|\$\d+\/hour)$/);
    }
  });
});

/**
 * The app calls one class by two different names, on different screens.
 *
 * Observed in the built export, not inferred: `/fleet` and `/corporate-info`
 * render **Luxury SUV** (from `VEHICLE_DISPLAY_NAME`), while the home screen's
 * recent trips render **Executive SUV** (from the API row's `name`, which the
 * booking picker, `PricingPreview` and `TrackingSheet` also use).
 *
 * Not fixed here: a class name is a customer-facing value, and this slice
 * changes none. Pinned so it cannot drift further, and so the fix — whichever
 * name wins — has to update this test on purpose.
 */
describe('the two names for the suv class', () => {
  it('still disagrees, and both names are still in the code', () => {
    expect(displayNames().suv).toBe('Luxury SUV');
    const demoData = readFileSync('src/dev/demoData.ts', 'utf8');
    expect(demoData).toContain("name: 'Executive SUV'");
  });

  it("the class's attributes describe the panel's Luxury SUV, not its Premium SUV", () => {
    /*
     * The hypothesis worth testing was that `suv` might be the panel's Premium
     * SUV wearing the Luxury SUV's name — which would mean a customer booking
     * "Luxury SUV" gets dispatched a Suburban. The attributes say otherwise.
     *
     * The app's `suv` row reads "Cadillac Escalade or equivalent", 6 passengers,
     * 6 bags, and its image asset is `luxury-suv.jpg`. The panel's Luxury SUV is
     * "Cadillac Escalade or equivalent", 6 and 6. Its Premium SUV is "Suburban
     * or equivalent". The example-vehicle phrasing matches verbatim.
     *
     * So the label is right and the PRICE is the thing out of step: a class
     * whose attributes are the Luxury SUV is published at From $110, against a
     * site figure of $130 and a panel minimum of $120.
     */
    const demoData = readFileSync('src/dev/demoData.ts', 'utf8');
    const suvRow = (demoData.split("id: 'demo-vehicle-suv'")[1] ?? '').split('},')[0] ?? '';
    expect(suvRow).toContain('Cadillac Escalade or equivalent');
    expect(suvRow).not.toContain('Suburban');
    expect(suvRow).toContain('capacity_passengers: 6');
    expect(suvRow).toContain('capacity_luggage: 6');

    const images = readFileSync('src/lib/vehicleImages.ts', 'utf8');
    expect(images).toContain('luxury-suv.jpg');
  });
});

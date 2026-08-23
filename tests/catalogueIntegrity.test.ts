import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  PUBLISHED_STARTING_LABELS,
  QUOTE_ONLY_VEHICLE_TYPES,
  isQuoteOnly,
  publishedStartingLabel,
} from '../src/config/publishedFleet';
import { OBSERVED_RATE_CARDS } from '../src/config/observedRateCards';

/**
 * THE APP NEVER PRICES A CLASS NOBODY HAS PRICED.
 *
 * ── Why this invariant and not the obvious one ──────────────────────────────
 * The obvious test would assert that the app's classes line up with the
 * client's operations panel. That would be wrong to write today, because
 * nobody has told us whether that panel is even the backend this app is meant
 * to talk to — `PLATFORM_RECONCILIATION.md` Q1, and everything else hangs off
 * it. A test encoding a guess about that would have to be unpicked later, and
 * in the meantime it would look like a settled decision.
 *
 * So this asserts the rule that holds NO MATTER WHICH catalogue wins: every
 * class the app shows is either backed by a published figure or is explicitly
 * unpriced and routed to dispatch. There is no third state, and it is the
 * third state — a number with no source — that this project has shipped twice.
 *
 * The panel comparison is recorded as data below rather than enforced.
 */

/**
 * The app's four classes, read from the type rather than retyped here.
 *
 * `src/types/api.ts` is the contract and must not be edited; parsing the union
 * out of it means this test tracks the contract instead of duplicating it, and
 * a fifth class added upstream shows up here as a failure to classify rather
 * than as silence.
 */
function appVehicleTypes(): string[] {
  const source = readFileSync('src/types/api.ts', 'utf8');
  const afterName = source.split('export type VehicleType')[1] ?? '';
  const decl = afterName.split(';')[0] ?? '';
  return [...decl.matchAll(/'([^']+)'/g)].flatMap((m) => (m[1] === undefined ? [] : [m[1]]));
}

const APP_TYPES = appVehicleTypes();

describe('catalogue integrity', () => {
  it('reads the app catalogue from the API contract', () => {
    // Guards the parse itself. A silently-empty list would make every
    // assertion below vacuously true, which is the failure mode of every
    // test that derives its own inputs.
    expect(APP_TYPES.length).toBeGreaterThan(0);
    expect(APP_TYPES).toContain('executive_sedan');
  });

  it('gives every class either a published figure or quote-only status — never neither', () => {
    const unclassified = APP_TYPES.filter((t) => publishedStartingLabel(t) === null && !isQuoteOnly(t));
    expect(unclassified).toEqual([]);
  });

  it('never prices a quote-only class', () => {
    // The Sprinter/Coach defect, pinned: the app showed "$211.61 ALL-IN" for
    // two classes the website marks "Request Quote". A quote-only class may
    // carry the words, never a figure.
    for (const type of QUOTE_ONLY_VEHICLE_TYPES) {
      const label = publishedStartingLabel(type);
      expect(label).not.toBeNull();
      expect(label).not.toMatch(/\d/);
    }
  });

  it('publishes a figure only where the business published one', () => {
    // The inverse: no class carries a starting price that is absent from the
    // published map. This is what stops a `base_rate` being printed as a
    // price again.
    for (const [type, label] of Object.entries(PUBLISHED_STARTING_LABELS)) {
      if (isQuoteOnly(type)) continue;
      expect(label).toMatch(/^From \$\d+$/);
    }
  });
});

/**
 * The panel comparison, recorded rather than enforced.
 *
 * These assertions pin what was TRUE on 2026-08-23 so that a change in either
 * catalogue shows up as a failing test with a diff, instead of as a document
 * quietly going out of date. They are a tripwire, not a policy: if the business
 * answers Q1 and Q2, the right response to a failure here may well be to change
 * the numbers rather than the app.
 */
describe('the two catalogues, as observed', () => {
  const panelNames = OBSERVED_RATE_CARDS.map((c) => c.displayName);

  it('has four classes in the app and five in the panel', () => {
    expect(APP_TYPES).toHaveLength(4);
    expect(OBSERVED_RATE_CARDS).toHaveLength(5);
  });

  it('leaves the two app classes with no panel counterpart unpriced', () => {
    /*
     * Display-name matching is the ONLY join available — the panel exposes
     * display names, not identifiers, and no mapping has been agreed. It is a
     * guess, and it is stated as one.
     *
     * The result of that guess, today: the app classes with no panel
     * counterpart are Mercedes Sprinter and Coach, and BOTH are already
     * quote-only. The 9B treatment therefore requires no code change — the
     * existing rule already covers exactly the right set, which was worth
     * computing rather than assuming.
     */
    const appDisplayNames: Record<string, string> = {
      executive_sedan: 'Executive Sedan',
      suv: 'Luxury SUV',
      sprinter: 'Mercedes Sprinter',
      coach: 'Coach',
    };
    const unmatched = APP_TYPES.filter((t) => !panelNames.includes(appDisplayNames[t] ?? ''));
    expect(unmatched).toEqual(['sprinter', 'coach']);
    for (const t of unmatched) expect(isQuoteOnly(t)).toBe(true);
  });

  it('records that three panel classes have no app equivalent', () => {
    const appDisplayNames = ['Executive Sedan', 'Luxury SUV', 'Mercedes Sprinter', 'Coach'];
    const panelOnly = panelNames.filter((n) => !appDisplayNames.includes(n));
    expect(panelOnly).toEqual(['Premium SUV', 'First Class', 'Large Group Transports']);
  });

  it('records that the two sources disagree on every class they share', () => {
    /*
     * Not a bug in either file. A minimum fare and a published "from" price are
     * different things, and there is no reason they must be equal. It is pinned
     * because the DIRECTION matters and is not consistent:
     *
     *   Executive Sedan  panel minimum $85  vs  published From $95   (below)
     *   Luxury SUV       panel minimum $120 vs  published From $110  (above)
     *
     * One published figure sits above its panel minimum and the other below.
     * Whatever the relationship between these two systems is, it is not a
     * single markup rule — which is exactly why the app must not derive one
     * from the other until somebody answers Q2.
     */
    const sedan = OBSERVED_RATE_CARDS.find((c) => c.displayName === 'Executive Sedan');
    const suv = OBSERVED_RATE_CARDS.find((c) => c.displayName === 'Luxury SUV');
    expect(sedan?.minimumFare).toBe(85);
    expect(suv?.minimumFare).toBe(120);
    expect(PUBLISHED_STARTING_LABELS.executive_sedan).toBe('From $95');
    expect(PUBLISHED_STARTING_LABELS.suv).toBe('From $110');
  });
});

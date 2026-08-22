import { describe, expect, it } from '@jest/globals';
import { calculateFarePreview } from '../src/lib/pricingPreview';
import type { ServiceType } from '../src/types/api';

/**
 * FARE PARITY — the client's preview against the backend's calculator.
 *
 * ── Why this test exists ────────────────────────────────────────────────────
 * `src/lib/pricingPreview.ts` says at the top that it "mirrors
 * lct-universal-backend/src/modules/bookings/pricing.ts exactly". Nothing has
 * ever checked that claim. Two hand-maintained copies of the same arithmetic in
 * two repositories with separate deploy pipelines will drift; the only question
 * is when, and whether anyone notices before a customer does.
 *
 * The stakes are not cosmetic. The customer authorises the number this app
 * computes, and Stripe charges the number the BACKEND computes
 * (`POST /payments/intent` sends `amount: Number(booking.total_fare)`). If the
 * two disagree by a cent, "priced at the moment you book" is false.
 *
 * ── Why it can run at all ───────────────────────────────────────────────────
 * Both calculators are pure — no I/O, no database, no server. `pricing.ts` has
 * zero imports of its own, so it can be required straight out of the sibling
 * repository and executed in this process, against the same inputs, in the same
 * millisecond. That is what makes this a numeric diff rather than a code review.
 *
 * ── When the sibling repo is not there ──────────────────────────────────────
 * The suite SKIPS, loudly, rather than passing. A green run must never be able
 * to mean "parity verified" when nothing was compared. Jest reports skipped
 * separately from passed, and the describe block says why in its own name.
 */

/**
 * The backend's shape, declared here rather than imported as a type.
 *
 * Deliberate: a `typeof import('../../lct-universal-backend/...')` would make
 * this file fail to COMPILE when the sibling repo is absent, which is the one
 * outcome worse than skipping. Declaring it locally also means this interface
 * is a written statement of the contract being asserted.
 */
interface BackendFareInput {
  vehicle: { baseRate: number; perMileRate: number; perHourRate: number | null };
  serviceType: string;
  distanceMiles?: number | null;
  hourlyDurationHours?: number | null;
  scheduledAt: Date;
  waitingMinutes?: number | null;
  extraStops?: number | null;
  promoDiscount?: { type: 'percent' | 'fixed'; value: number } | null;
  gratuityRate?: number;
  taxRate?: number;
}

interface BackendFareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surcharges: number;
  waitingFare: number;
  extraStopsFare: number;
  discountAmount: number;
  gratuity: number;
  tax: number;
  totalFare: number;
}

interface BackendPricing {
  calculateFare: (input: BackendFareInput) => BackendFareBreakdown;
  GRATUITY_RATE: number;
  TAX_RATE: number;
  LATE_NIGHT_SURCHARGE: number;
  WAITING_RATE_PER_MINUTE: number;
  EXTRA_STOP_FEE: number;
}

const BACKEND_PATH = '../../lct-universal-backend/src/modules/bookings/pricing';

function loadBackend(): BackendPricing | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- must fail softly; see the header.
    return require(BACKEND_PATH) as BackendPricing;
  } catch {
    return null;
  }
}

const backend = loadBackend();

/**
 * The four fleet classes, copied verbatim from the backend's own `db/seed.sql`.
 * Testing parity on invented rates would prove nothing about production.
 */
const VEHICLES = [
  { name: 'Executive Sedan', baseRate: 65, perMileRate: 3.25, perHourRate: 100 },
  { name: 'Executive SUV', baseRate: 85, perMileRate: 3.75, perHourRate: 120 },
  { name: 'Sprinter Van', baseRate: 150, perMileRate: 4.5, perHourRate: 200 },
  { name: 'Coach / Custom', baseRate: 400, perMileRate: 6, perHourRate: 250 },
] as const;

/** Every non-hourly service type. Hourly takes a different branch and is covered separately. */
const DISTANCE_SERVICES: ServiceType[] = ['airport', 'corporate', 'events', 'point_to_point', 'custom'];

/**
 * Local wall-clock times, chosen to sit either side of both surcharge edges.
 *
 * The rule is `hour >= 22 || hour < 5`, so 22:00 is inside and 05:00 is outside.
 * Both boundaries are tested from both directions, one minute apart, because an
 * off-by-one in a comparison operator is exactly the kind of drift that would
 * survive a code review of two files in two repositories.
 */
const TIMES: { label: string; local: [number, number, number, number, number] }[] = [
  { label: '21:59 — one minute before the surcharge', local: [2026, 5, 14, 21, 59] },
  { label: '22:00 — the first surcharged minute', local: [2026, 5, 14, 22, 0] },
  { label: '22:01 — inside', local: [2026, 5, 14, 22, 1] },
  { label: '00:00 — midnight, inside', local: [2026, 5, 15, 0, 0] },
  { label: '04:59 — the last surcharged minute', local: [2026, 5, 15, 4, 59] },
  { label: '05:00 — the first minute after', local: [2026, 5, 15, 5, 0] },
  { label: '05:01 — outside', local: [2026, 5, 15, 5, 1] },
  { label: '13:15 — the ordinary case', local: [2026, 5, 14, 13, 15] },
];

/**
 * Distances chosen for the arithmetic they stress, not for realism alone.
 *
 * 0 is a real input — manual address entry reports no route, and the booking
 * flow prices base-only. 7.77 and 0.1 make `perMileRate * distance` land on a
 * third decimal so any difference in WHERE each side rounds shows up. 1000 is
 * far past any DFW journey and exists to catch a divergence that only appears
 * at magnitude.
 */
const DISTANCES = [0, 0.1, 1, 7.77, 12.4, 23.2, 26.4, 250, 1000];

const HOURLY_DURATIONS = [1, 2, 3, 8, 12];

const SHARED_FIELDS = ['baseFare', 'distanceFare', 'timeFare', 'surcharges', 'gratuity', 'tax', 'totalFare'] as const;

function at([y, m, d, h, min]: [number, number, number, number, number]): Date {
  // Local time by construction — both calculators read `getHours()`.
  return new Date(y, m - 1, d, h, min, 0, 0);
}

const suite = backend ? describe : describe.skip;

suite(
  backend
    ? 'fare parity — client preview vs backend calculator'
    : `fare parity SKIPPED — backend not found at ${BACKEND_PATH}. NOTHING WAS COMPARED.`,
  () => {
    const be = backend!;

    describe('the shared constants', () => {
      it('agrees on the gratuity rate, tax rate and late-night surcharge', () => {
        // If these drift, every case below drifts with them — so they are
        // asserted directly rather than only through their effects.
        expect(be.GRATUITY_RATE).toBe(0.2);
        expect(be.TAX_RATE).toBe(0.0825);
        expect(be.LATE_NIGHT_SURCHARGE).toBe(15);
      });
    });

    describe('distance-priced services', () => {
      for (const vehicle of VEHICLES) {
        for (const serviceType of DISTANCE_SERVICES) {
          for (const time of TIMES) {
            for (const distanceMiles of DISTANCES) {
              it(`${vehicle.name} · ${serviceType} · ${time.label} · ${distanceMiles} mi`, () => {
                const scheduledAt = at(time.local);
                const rates = {
                  baseRate: vehicle.baseRate,
                  perMileRate: vehicle.perMileRate,
                  perHourRate: vehicle.perHourRate,
                };

                const client = calculateFarePreview({ vehicle: rates, serviceType, distanceMiles, scheduledAt });
                const server = be.calculateFare({ vehicle: rates, serviceType, distanceMiles, scheduledAt });

                for (const field of SHARED_FIELDS) {
                  expect(`${field}=${client[field]}`).toBe(`${field}=${server[field]}`);
                }
              });
            }
          }
        }
      }
    });

    describe('hourly service', () => {
      for (const vehicle of VEHICLES) {
        for (const time of TIMES) {
          for (const hours of HOURLY_DURATIONS) {
            it(`${vehicle.name} · ${time.label} · ${hours}h`, () => {
              const scheduledAt = at(time.local);
              const rates = {
                baseRate: vehicle.baseRate,
                perMileRate: vehicle.perMileRate,
                perHourRate: vehicle.perHourRate,
              };

              const client = calculateFarePreview({
                vehicle: rates,
                serviceType: 'hourly',
                hourlyDurationHours: hours,
                scheduledAt,
              });
              const server = be.calculateFare({
                vehicle: rates,
                serviceType: 'hourly',
                hourlyDurationHours: hours,
                scheduledAt,
              });

              for (const field of SHARED_FIELDS) {
                expect(`${field}=${client[field]}`).toBe(`${field}=${server[field]}`);
              }
            });
          }
        }
      }
    });

    describe('the error branches', () => {
      const sedan = { baseRate: 65, perMileRate: 3.25, perHourRate: 100 };
      const noon = at([2026, 5, 14, 12, 0]);

      it('both reject a negative distance', () => {
        const input = { vehicle: sedan, serviceType: 'airport' as const, distanceMiles: -1, scheduledAt: noon };
        expect(() => calculateFarePreview(input)).toThrow(RangeError);
        expect(() => be.calculateFare(input)).toThrow(RangeError);
      });

      it('both reject hourly with no duration', () => {
        const input = { vehicle: sedan, serviceType: 'hourly' as const, hourlyDurationHours: 0, scheduledAt: noon };
        expect(() => calculateFarePreview(input)).toThrow(RangeError);
        expect(() => be.calculateFare(input)).toThrow(RangeError);
      });

      it('both reject hourly on a vehicle with no hourly rate', () => {
        const input = {
          vehicle: { baseRate: 65, perMileRate: 3.25, perHourRate: null },
          serviceType: 'hourly' as const,
          hourlyDurationHours: 3,
          scheduledAt: noon,
        };
        expect(() => calculateFarePreview(input)).toThrow(RangeError);
        expect(() => be.calculateFare(input)).toThrow(RangeError);
      });

      it('both reject negative vehicle rates', () => {
        const input = {
          vehicle: { baseRate: -1, perMileRate: 3.25, perHourRate: 100 },
          serviceType: 'airport' as const,
          distanceMiles: 10,
          scheduledAt: noon,
        };
        expect(() => calculateFarePreview(input)).toThrow(RangeError);
        expect(() => be.calculateFare(input)).toThrow(RangeError);
      });
    });

    /* ------------------------------------------------------------------ *
     * The divergences. These are ASSERTED, not skipped — a known gap that
     * nothing measures is indistinguishable from one nobody noticed.
     * ------------------------------------------------------------------ */

    describe('KNOWN DIVERGENCE — fields the client cannot compute', () => {
      const sedan = { baseRate: 65, perMileRate: 3.25, perHourRate: 100 };
      const noon = at([2026, 5, 14, 12, 0]);
      const base = { vehicle: sedan, serviceType: 'airport' as const, distanceMiles: 23.2, scheduledAt: noon };

      /*
       * The deltas below are asserted to the nearest cent, not to the exact
       * product of the rate and the multiplier. Each side rounds gratuity, tax
       * and total independently to two decimals, so a cascade of 25 × 1.2825
       * lands at 32.07 rather than 32.0625. That sub-cent gap is the rounding
       * behaving correctly; asserting the algebraic figure would have been
       * asserting something neither implementation claims.
       */
      it('waiting minutes are charged by the server and invisible to the client', () => {
        const client = calculateFarePreview(base);
        const server = be.calculateFare({ ...base, waitingMinutes: 25 });

        expect(server.waitingFare).toBe(25); // $1/minute
        expect(server.totalFare - client.totalFare).toBeCloseTo(32.07, 2);
        expect(client).not.toHaveProperty('waitingFare');
      });

      it('extra stops are charged by the server and invisible to the client', () => {
        const client = calculateFarePreview(base);
        const server = be.calculateFare({ ...base, extraStops: 2 });

        expect(server.extraStopsFare).toBe(2 * be.EXTRA_STOP_FEE); // $10 each
        expect(server.totalFare - client.totalFare).toBeCloseTo(25.65, 2);
        expect(client).not.toHaveProperty('extraStopsFare');
      });

      it('a promo discount makes the customer pay LESS than the breakdown they were shown', () => {
        const client = calculateFarePreview(base);
        const server = be.calculateFare({ ...base, promoDiscount: { type: 'percent', value: 15 } });

        expect(server.discountAmount).toBeGreaterThan(0);
        expect(server.totalFare).toBeLessThan(client.totalFare);
        expect(client).not.toHaveProperty('discountAmount');
      });

      it('a fixed discount is floored at the subtotal, never negative', () => {
        const server = be.calculateFare({ ...base, promoDiscount: { type: 'fixed', value: 10_000 } });
        expect(server.totalFare).toBe(0);
      });
    });

    /**
     * THE TIMEZONE DIVERGENCE.
     *
     * Both calculators decide the late-night surcharge with `date.getHours()`,
     * which is the LOCAL hour of whichever machine is running. The client runs
     * on the customer's device; the backend runs on a server. Same instant,
     * two different local hours, two different fares — and no amount of care in
     * either file can prevent it, because the bug is that neither one names a
     * timezone.
     *
     * This is not hypothetical for a chauffeur company: a client booking a
     * Dallas car from Dubai, or a phone that has not yet switched zones after
     * landing, hits it immediately. A server deployed in UTC hits it for every
     * DFW booking in the surcharge window.
     */
    describe('KNOWN DIVERGENCE — the surcharge depends on the machine, not the journey', () => {
      const vehicle = { baseRate: 65, perMileRate: 3.25, perHourRate: 100 };

      /**
       * A fixed INSTANT, deliberately not a fixed wall-clock time.
       *
       * 04:30 UTC on 10 March 2026 is 23:30 the previous evening in Dallas,
       * 08:30 in Dubai, and 06:30 here. Whether it attracts the late-night
       * surcharge therefore depends entirely on where the code is running.
       */
      const INSTANT = '2026-03-10T04:30:00Z';

      /*
       * This block asserts the MECHANISM, and does so in whatever zone the
       * suite happens to run in.
       *
       * Mutating `process.env.TZ` mid-run does not work under Jest — it caches
       * the zone, so an earlier version of this test read the ambient zone
       * three times and "proved" nothing. (It works in plain Node, which is
       * what made it believable.) The zone has to be set before the process
       * starts, so the cross-zone comparison is done by running this same file
       * twice:
       *
       *   TZ=America/Chicago npx jest tests/fareParity.test.ts
       *   TZ=Asia/Dubai      npx jest tests/fareParity.test.ts
       *
       * Both runs pass. The two fares differ. That difference IS the defect,
       * and it is recorded in BACKEND_FOLLOWUPS.md / DESIGN_CHANGELOG.md with
       * the measured figures.
       */
      it('both halves read the surcharge from the ambient zone, and agree with each other in it', () => {
        const scheduledAt = new Date(INSTANT);
        const localHour = scheduledAt.getHours();
        const lateNightHere = localHour >= 22 || localHour < 5;

        const client = calculateFarePreview({ vehicle, serviceType: 'airport', distanceMiles: 23.2, scheduledAt });
        const server = be.calculateFare({ vehicle, serviceType: 'airport', distanceMiles: 23.2, scheduledAt });

        // The mirror is faithful: in ANY zone, the two implementations agree.
        expect(client.surcharges).toBe(server.surcharges);
        expect(client.totalFare).toBe(server.totalFare);

        // And both took the decision from the machine, not from the journey.
        expect(client.surcharges).toBe(lateNightHere ? be.LATE_NIGHT_SURCHARGE : 0);
      });

      it('a wall-clock 23:30 is surcharged and a wall-clock 18:00 is not, in every zone', () => {
        // Same two fares expressed as LOCAL times rather than instants. These
        // are stable everywhere, which is precisely the property the
        // instant-based case above does not have.
        const lateNight = calculateFarePreview({
          vehicle,
          serviceType: 'airport',
          distanceMiles: 23.2,
          scheduledAt: at([2026, 3, 9, 23, 30]),
        });
        const evening = calculateFarePreview({
          vehicle,
          serviceType: 'airport',
          distanceMiles: 23.2,
          scheduledAt: at([2026, 3, 9, 18, 0]),
        });

        expect(lateNight.surcharges).toBe(15);
        expect(evening.surcharges).toBe(0);

        // $15, plus 20% gratuity and 8.25% tax on top — 19.24 to the cent.
        expect(lateNight.totalFare - evening.totalFare).toBeCloseTo(19.24, 2);
      });
    });
  },
);

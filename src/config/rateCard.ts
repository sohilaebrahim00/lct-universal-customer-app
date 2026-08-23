/**
 * THE SHAPE OF A METERED RATE CARD. NO VALUES.
 *
 * This file defines what a vehicle class's pricing *is*. It deliberately
 * contains no numbers at all — not one base fare, not one per-mile rate. The
 * values live in files that name their own source, and this file is what makes
 * those files typed rather than free-form.
 *
 * ── Why the app's internal model is the rate card and not the "from" price ──
 * The business currently has two published price sources that disagree:
 *
 *   `publishedFleet.ts`      the marketing site — classes with "from" figures
 *   `observedRateCards.ts`   the operations panel — classes with full metered
 *                            rate cards
 *
 * Nobody has told us which one wins, and this file does not decide. It does not
 * have to, because the choice of *shape* is correct under either answer:
 *
 *   **A rate card is a superset of a "from" price.** A minimum fare yields a
 *   "from" figure — see `startingFromMinimum()` below. A "from" figure yields
 *   nothing: no per-mile rate, no per-minute rate, no hourly rate, and no way
 *   to price an actual journey.
 *
 * So the internal model is the rate card, and a marketing figure is either
 * derived from one or sourced separately and reconciled against it. What must
 * never happen again is a third number invented in a third place — that is
 * exactly how the app came to publish "From $65.00" against the company's own
 * published $95. See the history in `publishedFleet.ts`.
 *
 * ── This file is safe to import from anywhere ───────────────────────────────
 * Types and one pure function. The containment rule is on the DATA
 * (`observedRateCards.ts`), not on the shape — see `eslint.config.js` and
 * `tests/observedRateCardContainment.test.ts`. `startingFromMinimum()` cannot
 * leak an unpublished figure on its own, because the only way to call it is to
 * already hold a `RateCard`, and every `RateCard` that exists today is behind
 * that rule.
 */

/**
 * A whole-currency amount, e.g. `35` or `2.8` — dollars, not cents.
 *
 * Matches `FareBreakdown` in `src/lib/pricingPreview.ts` rather than the
 * `numeric(10,2)` strings the API returns, because nothing here comes from the
 * API. Anything crossing the API boundary still goes through
 * `serverFare.ts`, which is the one place `Number()` is applied.
 */
export type UsdAmount = number;

/**
 * The badge a class carries in the operations panel.
 *
 * A closed union rather than `string`, so a typo is a compile error and so the
 * set is visible in one place. `null` is a real value — most classes carry no
 * tag — and is not the same as an empty string.
 */
export type RateCardTierTag = 'POPULAR' | 'VIP' | 'GROUP';

/**
 * One vehicle class's complete metered pricing.
 *
 * Every field is required. There is no partial rate card: a class missing its
 * minimum fare is not a class with an unknown minimum, it is a transcription
 * that was not finished, and `Partial<>` here would let that ship silently.
 * Where a field genuinely has no value in the source, its type admits `null`
 * explicitly and the reason is recorded at the value.
 */
export interface RateCard {
  /**
   * Stable identifier for this class *within the source it came from*.
   *
   * NOT necessarily the app's `VehicleType`. The panel's classes and the app's
   * four `VehicleType` values are different catalogues that have not been
   * reconciled — mapping one to the other is a business decision, and inventing
   * the mapping here would bury it. See `PLATFORM_RECONCILIATION.md`.
   */
  readonly classKey: string;

  /** Exactly as the source displays it. Not title-cased, not reworded. */
  readonly displayName: string;

  /** The source's badge, or `null` when it carries none. */
  readonly tierTag: RateCardTierTag | null;

  /**
   * The source's own example-vehicle phrasing, verbatim.
   *
   * Kept as one string rather than split into make and model precisely because
   * the phrasing carries the hedge — "or equivalent" is doing real work, and a
   * `{ make, model }` pair would quietly promise a specific car. The project
   * already has a rule against fabricated vehicle identity; this preserves the
   * source's own hedging instead of stripping it.
   */
  readonly exampleVehicle: string;

  /** Fixed amount before any distance or time is metered. */
  readonly baseFare: UsdAmount;

  /** Per mile travelled. */
  readonly perMile: UsdAmount;

  /**
   * Per minute elapsed.
   *
   * THE APP HAS NO EQUIVALENT. `calculateFarePreview()` meters distance or
   * hours, never minutes. Recorded here because it exists in the source, not
   * because anything consumes it.
   */
  readonly perMinute: UsdAmount;

  /**
   * The floor. A journey metering below this is charged this.
   *
   * THE APP HAS NO EQUIVALENT either, and this is the field that makes the
   * superset argument concrete: it is what a "from" price is derived from.
   */
  readonly minimumFare: UsdAmount;

  /** Hourly-hire rate. The app's `per_hour_rate` is the same idea. */
  readonly perHour: UsdAmount;

  /** Maximum passengers. */
  readonly seats: number;

  /** Maximum bags, or `null` where the source states none. */
  readonly bags: number | null;

  /**
   * A CONFIGURED number of minutes — typed into an admin form by a person.
   *
   * Named `configured` rather than `eta` on purpose, and the name is the whole
   * point of the field. This is **not** a live estimate: nothing measured it,
   * nothing recomputes it, and it does not know where the customer is standing.
   * Rendering it as "arrives in N minutes" would turn a settings value into a
   * promise about a car that may not exist yet.
   *
   * `null` where the source shows none. Whether these figures are hand-entered
   * or computed upstream is an open question — `PLATFORM_RECONCILIATION.md` Q7.
   */
  readonly configuredEtaMinutes: number | null;
}

/**
 * The "from" figure implied by a rate card's minimum fare.
 *
 * This is the superset argument as code: a rate card yields a starting price,
 * and a starting price yields no rate card. Returns the amount, not a formatted
 * label — formatting belongs to `formatCurrency`, and a function that returned
 * `"From $85"` would be a second place that decides how money is written.
 *
 * ── What this is NOT ────────────────────────────────────────────────────────
 * It is not a claim that the derived figure equals what the business publishes.
 * They currently do not match, and that mismatch is a finding rather than
 * something to smooth over — see `PLATFORM_RECONCILIATION.md`. Deriving a
 * customer-facing "from" price from an unconfirmed rate card would be inventing
 * the third number all over again, which is why the data this would run against
 * is fenced off by lint rule and test.
 */
export function startingFromMinimum(card: RateCard): UsdAmount {
  return card.minimumFare;
}

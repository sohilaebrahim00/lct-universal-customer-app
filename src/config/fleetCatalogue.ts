import type { VehicleType } from '../types/api';
import { PUBLISHED_NAMES_BY_PAGE, publishedStartingLabel } from './publishedFleet';

/**
 * THE CUSTOMER-FACING FLEET CATALOGUE — a display layer, not a price list.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  Two things that look alike and must never merge:
 *
 *    A PUBLISHED STARTING LABEL  "From $130", "$150/hour" — marketing copy
 *                                the business publishes. Authoritative as a
 *                                LABEL. Not a rate card.
 *
 *    A RATE CARD                 base + per-mile + per-hour, on the `vehicles`
 *                                row. What the fare engine multiplies. The
 *                                only thing a customer is ever charged from.
 *
 *  A label cannot become a rate card. "From $130" is one number where the
 *  engine needs three, and the two missing ones would have to be invented.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * So this file lists what a customer SEES and holds no pricing of its own. A
 * class that can be booked points at a `VehicleType`, and the screen reads that
 * class's real capacities and real fare from the API — there is exactly one
 * copy of every price in this project and it is not here.
 *
 * ── Why the seven do not map one-to-one onto four IDs ─────────────────────
 * `VehicleType` is `executive_sedan | suv | sprinter | coach` and stays that
 * way: bookings, dispatch, stored trips and the fare engine all key on those
 * strings, and a fleet update must not migrate historical records. Three of
 * the seven classes therefore have **no** `vehicleType` — they are catalogue
 * entries only, priced by a person, and cannot reach calculated checkout
 * because the booking picker renders from the API rather than from this file.
 */

export type PricingMode =
  /** Has a rate card. The fare engine quotes it; the label comes from the site. */
  | 'bookable'
  /** No rate card. Shown with whatever the business publishes, or Request Quote. */
  | 'request-quote';

export interface FleetClass {
  /** Stable catalogue key. Display-layer only — never stored on a booking. */
  key: string;
  /** Customer-facing name, from the client's 2026-09-10 fleet list. */
  name: string;
  /**
   * The bookable class whose rate card and capacities power this entry, or
   * null when the catalogue carries it for display only.
   */
  vehicleType: VehicleType | null;
  /** `null` means the supplied asset is unusable — see `assetNote`. */
  image: number | null;
  /** Why an image is missing, shown to nobody but read by whoever fixes it. */
  assetNote?: string;
  /**
   * Passengers. For a bookable class this is the API's figure and this value
   * is only a fallback for the fleet page before the fetch lands.
   */
  passengers: number;
  /**
   * Luggage, ONLY where the business has confirmed it. Never inferred from
   * passenger count — a 56-seat coach does not carry 56 bags.
   */
  luggage: number | null;
  pricingMode: PricingMode;
  /**
   * What the price row reads. For `request-quote` classes this is either a
   * published starting label (authoritative as a label) or the app's existing
   * quote wording. Never a computed figure.
   */
  priceLabel: string;
  description: string;
}

/** The site's own words for a class that is quoted rather than metered. */
const REQUEST_QUOTE = 'Request Quote';

/**
 * Read back from `PUBLISHED_NAMES_BY_PAGE` rather than retyped, so a label
 * shown to a customer traces to the page and date it was read from
 * (`/rates`, 2026-08-26). Retyping "$150/hour" here would be a second copy of
 * a business figure, which is how the two SUV names diverged in the first place.
 */
function publishedLabelFor(fleetName: string): string {
  const row = PUBLISHED_NAMES_BY_PAGE.classes.find((c) => c.fleet === fleetName);
  return row?.published ?? REQUEST_QUOTE;
}

/**
 * A label the client confirmed directly, which outranks a site reading.
 *
 * Same principle as `publishedLabelFor`: read back from the one place that
 * records the figure and its date, never retyped here. If the confirmation is
 * ever withdrawn, deleting the entry restores the published label with no
 * change to this file.
 */
function confirmedLabelFor(vehicleType: string): string {
  return publishedStartingLabel(vehicleType) ?? REQUEST_QUOTE;
}

/**
 * The seven, in the order the client listed them.
 *
 * ── Naming, and the conflict it resolves ──────────────────────────────────
 * The client's 2026-09-10 message maps **Premium SUV → Escalade** and **Luxury
 * SUV → Suburban**. Their operations panel, read 2026-08-26, maps them the
 * other way. The client's message is the later statement and is explicitly the
 * customer-facing direction, so the catalogue follows it — **at the display
 * layer only**. `VehicleType.suv` is untouched, so nothing stored on a booking
 * moves. `OPEN_QUESTIONS.md` #15 keeps the contradiction visible.
 */
export const FLEET_CATALOGUE: readonly FleetClass[] = [
  {
    key: 'premium_suv',
    name: 'Premium SUV',
    // The $110 class. Its row has always described a Cadillac Escalade, which
    // is also the vehicle the client's supplied image shows.
    vehicleType: 'suv',
    image: require('../../assets/vehicles/premium-suv-escalade.jpg'),
    passengers: 6,
    luggage: 6,
    pricingMode: 'bookable',
    priceLabel: publishedLabelFor('Executive SUV'),
    description: 'Premium SUV transportation with spacious seating and refined comfort.',
  },
  {
    key: 'luxury_suv',
    name: 'Luxury SUV',
    /*
     * DISPLAY ONLY. The site publishes "From $130" for this class and nothing
     * else — no base, no per-mile, no per-hour. It cannot be quoted by the
     * engine, so it has no `vehicleType` and cannot reach the booking picker.
     */
    vehicleType: null,
    /*
     * ASSET REQUIRED. The supplied Suburban image has a malformed door badge
     * reading "SUBURBIAY". Publishing a misspelt vehicle badge on the screen
     * where a customer chooses what to pay for is worse than showing no
     * photograph, and this codebase does not repair branded imagery itself.
     */
    image: null,
    assetNote: 'Supplied Suburban image has a malformed door badge ("SUBURBIAY"). Clean asset required.',
    passengers: 6,
    luggage: 6,
    pricingMode: 'request-quote',
    priceLabel: publishedLabelFor('Luxury SUV'),
    description: 'Luxury SUV service with generous passenger and luggage space.',
  },
  {
    key: 'first_class',
    name: 'First Class',
    /*
     * Mapped to `executive_sedan` per the client's direction: the internal ID
     * is kept so historical bookings, dispatch records and the fare engine are
     * untouched, and only the customer-facing name moves.
     *
     * ── THE PRICING DISCREPANCY IS RESOLVED — confirmed 2026-09-13 ───────
     * This class showed "From $95", which is what `/fleet` publishes for
     * "Executive Sedan". Renamed to First Class, it was carrying a label
     * belonging to a differently-named class while the site published *First
     * Class Sedan* at $150/hour.
     *
     * **The client confirmed $150/hour directly**, so that is what a customer
     * sees, via `CLIENT_CONFIRMED_LABELS` — which records the date and what it
     * supersedes, rather than editing the 2026-08-26 site reading away.
     *
     * What the confirmation did NOT include: a base fare or a per-mile rate.
     * Neither was invented. The hourly component of the rate card moved to
     * $150 and the other two did not, so a ONE-WAY First Class trip is still
     * computed from $65 + $3.25/mile exactly as before — see the note on
     * `per_hour_rate` in `src/dev/demoData.ts`.
     */
    vehicleType: 'executive_sedan',
    image: require('../../assets/vehicles/first-class-sedan.jpg'),
    passengers: 3,
    luggage: 3,
    pricingMode: 'bookable',
    priceLabel: confirmedLabelFor('executive_sedan'),
    description: 'Executive sedan service for a refined private travel experience.',
  },
  {
    key: 'executive_sprinter',
    name: 'Executive Sprinter',
    vehicleType: 'sprinter',
    image: require('../../assets/vehicles/executive-sprinter.jpg'),
    // 13 from the client, 2026-09-10. Luggage 10 is the site's own figure —
    // NOT a copy of the passenger count. See the row in demoData.
    passengers: 13,
    luggage: 10,
    pricingMode: 'bookable',
    priceLabel: publishedLabelFor('Executive Sprinter'),
    description: 'Executive group transportation for up to 13 passengers.',
  },
  {
    key: 'mini_bus_27',
    name: 'Mini Bus',
    // Published on neither page. Capacity is the client's, price is unquoted.
    vehicleType: null,
    image: require('../../assets/vehicles/mini-bus-27.jpg'),
    passengers: 27,
    // Unknown. Omitted rather than guessed — see the `luggage` field note.
    luggage: null,
    pricingMode: 'request-quote',
    priceLabel: REQUEST_QUOTE,
    description: 'Comfortable group transportation for up to 27 passengers.',
  },
  {
    key: 'mini_coach_40',
    name: 'Mini Coach',
    vehicleType: null,
    /*
     * ASSET REQUIRED. The supplied mid-coach image renders LCT's own tagline as
     * "EXECUTIVE TRANSPOR T5". A misspelling inside the client's own logo
     * lockup is the one defect that must not ship — it damages the brand it is
     * meant to present.
     */
    image: null,
    assetNote: 'Supplied Freightliner image renders LCT’s tagline as "EXECUTIVE TRANSPOR T5". Clean asset required.',
    // 40 from the client. The site said 39 on 2026-08-26 — see OPEN_QUESTIONS #15.
    passengers: 40,
    luggage: null,
    pricingMode: 'request-quote',
    priceLabel: publishedLabelFor('Executive Mini Coach'),
    description: 'Premium group transportation for up to 40 passengers.',
  },
  {
    key: 'motor_coach_56',
    name: 'Motor Coach',
    vehicleType: null,
    image: require('../../assets/vehicles/motor-coach-mci.jpg'),
    // 56 — the one group capacity the client and the site agree on.
    passengers: 56,
    luggage: null,
    pricingMode: 'request-quote',
    priceLabel: publishedLabelFor('Executive Coach'),
    description: 'Large-group transportation for up to 56 passengers.',
  },
];

/** Accessibility label: the class and its capacity, never a filename. */
export function fleetAccessibilityLabel(entry: FleetClass): string {
  const bags = entry.luggage === null ? '' : `, ${entry.luggage} bags`;
  return `${entry.name}, ${entry.passengers} passengers${bags}`;
}

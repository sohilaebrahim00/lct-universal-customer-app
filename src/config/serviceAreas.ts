/**
 * WHERE LCT OPERATES, AS THE BUSINESS PUBLISHES IT.
 *
 * A fact about the business, in the same category as `servicePolicy.ts` and
 * `publishedFleet.ts`, and recorded the same way: transcribed verbatim from a
 * named page with the date it was read.
 *
 * ── Why it exists ──────────────────────────────────────────────────────────
 * The operations console has a Coverage section. It was an empty state saying
 * the app had no service-area concept, which was true — and the answer was
 * published on the client's own website the whole time. That is exactly the
 * shape of question a re-read is for.
 *
 * ── What it must NOT be used for ───────────────────────────────────────────
 * **This does not gate booking.** Nothing checks an address against this list
 * and refuses a ride. The site itself says *"Availability is confirmed on a
 * per-trip basis"*, so a list of cities is a description of where the fleet
 * dispatches, not a rule about who may book. Using it to reject a customer
 * would turn a marketing page into a policy nobody agreed.
 *
 * It is displayed, in the operations console, and that is all.
 */

export const SERVICE_AREA_SOURCE = {
  source: 'lctuniversal.com/service-areas',
  /** ISO date the page was read, in full, from primary source. */
  readOn: '2026-08-26',
  /** The company's own summary line, verbatim. */
  summary:
    'LCT Universal is based in Grapevine, Texas and dispatches to the communities listed above — we do not operate branch offices in every city served.',
  /** Also verbatim, and the reason this list is not a booking rule. */
  availabilityNote: 'Availability is confirmed on a per-trip basis.',
} as const;

export interface ServiceRegion {
  name: string;
  /** The page's own one-line description of the region. */
  description: string;
  cities: readonly string[];
}

/** The three regions the page groups its cities into, in its own order. */
export const SERVICE_REGIONS: readonly ServiceRegion[] = [
  {
    name: 'Dallas & Surrounding Communities',
    description:
      'Downtown Dallas, the Park Cities, and the close-in suburbs across the eastern and southern Metroplex.',
    cities: [
      'Dallas', 'Highland Park', 'University Park', 'Addison', 'Farmers Branch',
      'Garland', 'Richardson', 'Mesquite', 'Balch Springs', 'Sunnyvale',
      'Rowlett', 'Sachse', 'Seagoville', 'Hutchins', 'Wilmer', 'Lancaster',
      'DeSoto', 'Duncanville', 'Cedar Hill', 'Red Oak', 'Glenn Heights', 'Ovilla',
    ],
  },
  {
    name: 'Fort Worth & Southwest Metro',
    description:
      'Downtown and the Cultural District, plus the cities ringing Fort Worth to the west, south, and southwest.',
    cities: [
      'Fort Worth', 'Arlington', 'Benbrook', 'Lake Worth', 'River Oaks',
      'White Settlement', 'Westworth Village', 'Sansom Park', 'Forest Hill',
      'Everman', 'Edgecliff Village', 'Kennedale', 'Mansfield', 'Crowley',
      'Burleson', 'Pantego', 'Dalworthington Gardens',
    ],
  },
  {
    name: 'Mid-Cities & North DFW',
    description:
      'The corridor between Dallas and Fort Worth, from Grapevine and Southlake north through Keller and Saginaw.',
    cities: [
      'Grapevine', 'Southlake', 'Colleyville', 'Westlake', 'Trophy Club',
      'Roanoke', 'Keller', 'Euless', 'Bedford', 'Hurst', 'North Richland Hills',
      'Richland Hills', 'Haltom City', 'Watauga', 'Saginaw', 'Haslet', 'Azle',
      'Blue Mound',
    ],
  },
];

export const SERVICE_AREA_CITY_COUNT = SERVICE_REGIONS.reduce((n, r) => n + r.cities.length, 0);

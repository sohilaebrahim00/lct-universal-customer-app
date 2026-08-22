import { gold, neutral } from './ref';

/**
 * The map's palette, derived from the app's own tokens.
 *
 * Separate from `mapStyle.ts` because Google's `MapTypeStyle` wants flat hex
 * strings and nothing else — no alpha, no rgba, no references. Resolving the
 * tokens here keeps the style file readable as a style file, and means a
 * palette change moves one value rather than fifteen.
 *
 * Every value is a token or a stated derivation from one. Nothing here is a
 * colour someone liked.
 */
export const ref = {
  /** The page colour. Land reads as the same ground the UI sits on. */
  land: neutral[0],
  /** Buildings and man-made landscape — the first raised step, as elsewhere. */
  surface: neutral[100],
  /** County and city boundaries. Present but barely. */
  admin: neutral[200],

  /** Ordinary roads: the sheet fill, so they read as surface rather than ink. */
  road: neutral[200],
  /** Residential streets, one step back again so the arterials carry the eye. */
  roadLocal: neutral.inset,
  /**
   * Arterials and highways in champagne — the two steps that matter for a
   * journey across the metroplex.
   *
   * This is the one place gold is used decoratively rather than as an action.
   * The rationing rule in `sys.ts` is about interface accent competing with
   * itself; a road is not tappable, and nothing on the map is.
   *
   * Both are DARKER than any gold in the UI scale, deliberately. `gold[500]`
   * on near-black glows, and a glowing road network would out-shout the one
   * moving marker the screen exists for. `gold[700]` (#a26e22) is the darkest
   * step the scale carries and takes the highways; arterials sit a step below
   * it again at #6b4816 — that is `gold[700]` at ~65% luminance, derived here
   * rather than added to `ref.ts` because it has exactly one use and is not a
   * UI colour.
   */
  roadHighway: gold[700],
  roadArterial: '#6b4816',

  /** Labels: the app's secondary and tertiary content steps. */
  label: neutral[600],
  roadLabel: neutral[500],
  waterLabel: neutral[400],

  /** Lake Ray Hubbard, Grapevine Lake, the Trinity. Darker than land. */
  water: '#07090c',
} as const;

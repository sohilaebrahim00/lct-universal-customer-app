/**
 * BUSINESS INPUTS PENDING CONFIRMATION.
 *
 * These are commitments LCT Universal makes to a customer. None of them can be
 * inferred from the code, the backend or the design — they come from the
 * business, and until they do, the app says nothing.
 *
 * ── The rule ────────────────────────────────────────────────────────────────
 * A `null` value renders NOTHING. Not a dash, not an em-dash, not "—", not a
 * greyed placeholder, not a "coming soon". The row, the line, the note simply
 * does not exist. A plausible-looking number in a cancellation promise above a
 * pay button is a commitment the business has not made, and a customer would be
 * right to hold them to it.
 *
 * Every consumer therefore reads as:
 *
 *   {servicePolicy.freeCancellationWindowHours !== null ? (
 *     <Text>Free cancellation until {servicePolicy.freeCancellationWindowHours} hours before pickup.</Text>
 *   ) : null}
 *
 * ── Where these are consumed ────────────────────────────────────────────────
 *   freeCancellationWindowHours  → Payment screen, directly above the authorise
 *                                  button. The design reserves the slot; only
 *                                  the source of the number changed.
 *   complimentaryWaitMinutes     → Destination sheet (airport note) and the
 *                                  confirmation screen.
 *   onDemandEnabled              → Gates any "Now" affordance on the when-and-who
 *                                  screen. Stays false until dispatch confirms
 *                                  they can actually service an immediate
 *                                  request; "In 60 min" is the first time chip
 *                                  either way, which is correct whichever way
 *                                  this resolves.
 *
 * All three are listed in DESIGN_CHANGELOG.md under "blocked on business input,
 * must be set before launch."
 */
export const servicePolicy = {
  /** Hours before pickup that cancellation remains free. `null` → the payment screen states no policy. */
  freeCancellationWindowHours: null as number | null,

  /** Complimentary wait time included in the fare, in minutes. `null` → the note does not render. */
  complimentaryWaitMinutes: {
    standard: null as number | null,
    airport: null as number | null,
  },

  /**
   * Whether dispatch can service an immediate request. Not confirmed.
   * The client currently enforces a one-hour minimum lead time
   * (`MIN_LEAD_TIME_MS` in the booking flow); this flag is what would relax it.
   */
  onDemandEnabled: false,
} as const;

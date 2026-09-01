/**
 * DOES EITHER END OF THIS JOURNEY LOOK LIKE AN AIRPORT?
 *
 * Used to decide whether to offer the optional flight-number field. It was
 * previously `serviceType === 'airport'` alone, which meant a customer booking
 * point-to-point from home to DFW Terminal D — an extremely common way to book
 * an airport run — never saw the field at all.
 *
 * ── This is a HEURISTIC on an address string, and it is safe to be one ─────
 * It reads text, not a place type, so it will occasionally be wrong. The
 * consequence of each kind of wrong is what makes that acceptable:
 *
 *   false positive → an optional field appears on a journey that is not an
 *                    airport run. The customer ignores it. Nothing breaks.
 *   false negative → the field does not appear, which is exactly the behaviour
 *                    before this existed.
 *
 * It only ever WIDENS where the field is offered. It is never used to price
 * anything, to pick a policy, or to decide a service type — the complimentary
 * waiting window still comes from `servicePolicy` keyed on the real
 * `ServiceType`, never from this. A guess must not reach a promise.
 *
 * ── Why these terms ────────────────────────────────────────────────────────
 * The fleet operates in Dallas–Fort Worth (`lctuniversal.com/service-areas`,
 * read 2026-08-26), so the two airports that matter are DFW International and
 * Dallas Love Field. The generic terms catch the rest without needing a list of
 * every airport in the world, which is what a place-type lookup would give and
 * this deliberately is not.
 */
const AIRPORT_HINTS = [
  'airport',
  'terminal',
  'dfw',
  'love field',
  // IATA codes appear in saved-location labels and typed entries alike.
  ' dal ',
  'international pkwy',
];

export function looksLikeAirport(address: string | null | undefined): boolean {
  if (!address) return false;
  const haystack = ` ${address.toLowerCase()} `;
  return AIRPORT_HINTS.some((hint) => haystack.includes(hint));
}

/**
 * Should the flight-number field be offered for this journey?
 *
 * True when the customer explicitly chose the airport service, OR when either
 * end reads like an airport. The explicit choice is checked first because it is
 * a fact rather than a guess.
 */
export function shouldOfferFlightNumber(
  serviceType: string | null | undefined,
  pickupAddress: string | null | undefined,
  dropoffAddress: string | null | undefined,
): boolean {
  if (serviceType === 'airport') return true;
  return looksLikeAirport(pickupAddress) || looksLikeAirport(dropoffAddress);
}

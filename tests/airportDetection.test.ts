import { describe, expect, it } from '@jest/globals';
import { looksLikeAirport, shouldOfferFlightNumber } from '../src/lib/airportDetection';

/**
 * The flight field is OFFERED, never assumed. These assertions pin the two
 * things that matter: that a real airport run gets the field, and that this
 * guess never widens into anything that makes a promise.
 */
describe('offering the flight-number field', () => {
  it('recognises the DFW-area airports the fleet actually serves', () => {
    expect(looksLikeAirport('2337 S International Pkwy, DFW Airport, TX')).toBe(true);
    expect(looksLikeAirport('8008 Herb Kelleher Way, Dallas Love Field, TX')).toBe(true);
    expect(looksLikeAirport('DFW Terminal D')).toBe(true);
  });

  it('does not fire on ordinary addresses', () => {
    expect(looksLikeAirport('4820 Maple Ave, Dallas, TX')).toBe(false);
    expect(looksLikeAirport('2100 Ross Ave, Dallas, TX')).toBe(false);
    expect(looksLikeAirport('1501 Gaylord Trail, Grapevine, TX')).toBe(false);
    expect(looksLikeAirport(null)).toBe(false);
    expect(looksLikeAirport('')).toBe(false);
  });

  it('offers the field on an airport SERVICE regardless of address', () => {
    // The explicit choice is a fact, not a guess, and is checked first.
    expect(shouldOfferFlightNumber('airport', null, null)).toBe(true);
  });

  it('offers it when EITHER end is an airport, which is the gap this closed', () => {
    /*
     * Before this existed the condition was `serviceType === 'airport'` alone,
     * so a point-to-point booking from home to DFW — a very common way to book
     * an airport run — never saw the field.
     */
    expect(shouldOfferFlightNumber('point_to_point', '4820 Maple Ave, Dallas, TX', 'DFW Terminal D')).toBe(true);
    expect(shouldOfferFlightNumber('point_to_point', 'DFW Terminal D', '4820 Maple Ave, Dallas, TX')).toBe(true);
  });

  it('stays quiet on a journey with neither end at an airport', () => {
    expect(shouldOfferFlightNumber('point_to_point', '4820 Maple Ave, Dallas, TX', '2100 Ross Ave, Dallas, TX')).toBe(false);
  });
});

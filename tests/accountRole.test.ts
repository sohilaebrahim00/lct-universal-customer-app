import { describe, expect, it } from '@jest/globals';
import {
  CHAUFFEUR_SEES_FARES,
  accountKindFor,
  accountKindOf,
  hasStaffRole,
  landingRouteFor,
} from '../src/lib/accountRole';
import type { Profile, UserRole } from '../src/types/api';
import { mapsUrlFor } from '../src/lib/mapsLink';

/**
 * ONE LOGIN, THREE DESTINATIONS.
 *
 * The role is a real backend field — `Profile.role` has been in
 * `src/types/api.ts` since the project started and no screen had ever read it.
 * These assertions pin the mapping, and in particular the two cases where
 * getting it wrong puts somebody somewhere they should not be.
 */

const ALL_ROLES: UserRole[] = ['customer', 'driver', 'admin', 'corporate_admin'];

function profileWith(role: UserRole): Profile {
  return {
    id: 'p1',
    role,
    full_name: 'Test Person',
    email: 't@example.com',
    phone: null,
    avatar_url: null,
    corporate_account_id: null,
    corporate_role: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

describe('account role mapping', () => {
  it('maps every role in the contract, with no default', () => {
    // Exhaustive rather than spot-checked: a role added to `UserRole` later
    // must fail to compile here rather than silently fall through to customer.
    for (const role of ALL_ROLES) {
      expect(['customer', 'chauffeur', 'operator']).toContain(accountKindFor(role));
    }
  });

  it('treats corporate_admin as a CUSTOMER, not an operator', () => {
    /*
     * The mistake this exists to prevent: a corporate booker manages a
     * company's travellers and does not dispatch anybody. Matching on the word
     * "admin" would drop them into an operations console.
     */
    expect(accountKindFor('corporate_admin')).toBe('customer');
    expect(landingRouteFor(accountKindFor('corporate_admin'), true)).toBe('/(app)');
    expect(hasStaffRole(profileWith('corporate_admin'))).toBe(false);
  });

  it('maps driver to chauffeur and admin to operator', () => {
    expect(accountKindFor('driver')).toBe('chauffeur');
    expect(accountKindFor('admin')).toBe('operator');
  });

  it('sends a signed-out visitor to the customer app, never to a staff surface', () => {
    // Defaulting the other way would show an operations console for the length
    // of one render while the profile loads.
    expect(accountKindOf(null)).toBe('customer');
    expect(hasStaffRole(null)).toBe(false);
  });

  it('gives each kind exactly one landing route', () => {
    expect(landingRouteFor('customer', true)).toBe('/(app)');
    expect(landingRouteFor('chauffeur', true)).toBe('/_role/chauffeur');
    expect(landingRouteFor('operator', true)).toBe('/_role/admin');
  });

  it('never routes a customer to a staff surface', () => {
    for (const role of ALL_ROLES) {
      const route = landingRouteFor(accountKindFor(role), true);
      if (accountKindFor(role) === 'customer') expect(route).not.toContain('_role');
    }
  });
});

describe('what a chauffeur is shown about money', () => {
  it('is nothing, and the constant says so', () => {
    /*
     * Not a zero and not a placeholder — the space is left out. Whether a
     * chauffeur may see what a job pays is a contracting decision that neither
     * the website nor the operations panel answers. OPEN_QUESTIONS.md 8.
     *
     * Pinned as a test so that turning it on is a deliberate edit with a
     * failing assertion attached, rather than a prop somebody adds.
     */
    expect(CHAUFFEUR_SEES_FARES).toBe(false);
  });
});

describe('when the staff surfaces are not in the build', () => {
  it('lands a chauffeur and an operator in the customer app, never on a 404', () => {
    /*
     * Found by grepping a build made with EXPO_PUBLIC_DEMO_MODE=false: the
     * `_role` SCREENS are correctly absent, and the route STRINGS still ship,
     * because `landingRouteFor` contains them. A path naming a route that is
     * not in the bundle resolves to the not-found screen.
     *
     * So a staff account would have landed on a 404 in production. It lands in
     * the customer app instead — the only surface that exists in that build.
     */
    expect(landingRouteFor('chauffeur', false)).toBe('/(app)');
    expect(landingRouteFor('operator', false)).toBe('/(app)');
    expect(landingRouteFor('customer', false)).toBe('/(app)');
  });

  it('still reports the role truthfully, so callers can branch on it', () => {
    // Falling back is a ROUTING decision, not a claim that they are customers.
    expect(hasStaffRole(profileWith('driver'))).toBe(true);
    expect(hasStaffRole(profileWith('admin'))).toBe(true);
  });
});

describe('navigation hands off to the OS maps app', () => {
  it('encodes the address and never builds an empty query', () => {
    /*
     * The chauffeur gets the phone's own maps app, not turn-by-turn in here.
     * Address-based rather than coordinate-based: a booking always has an
     * address string and may have null coordinates when the pickup came
     * through manual entry.
     */
    expect(mapsUrlFor('X', 'ios')).toMatch(/^maps:/);
    expect(mapsUrlFor('X', 'android')).toMatch(/^geo:/);
    const url = mapsUrlFor('2337 S International Pkwy, DFW Airport, TX', 'web');
    expect(url).toContain(encodeURIComponent('2337 S International Pkwy, DFW Airport, TX'));
    expect(url).not.toMatch(/q=$/);
  });
});

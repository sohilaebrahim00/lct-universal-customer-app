import type { Profile, UserRole } from '../types/api';
import { isDemoMode } from './env';

/**
 * WHERE AN ACCOUNT LANDS AFTER SIGN-IN.
 *
 * ── There is no chauffeur app ───────────────────────────────────────────────
 * One app, one login screen. A chauffeur signs in exactly as a customer does
 * and lands somewhere different because their account says so. Same for an
 * operator.
 *
 * ── The field already existed, and nothing had ever read it ────────────────
 * `Profile.role` is `UserRole = 'customer' | 'driver' | 'admin' |
 * 'corporate_admin'` — declared in `src/types/api.ts` since the project
 * started, served by the real backend, and **read by no screen in the app**.
 * This module is the first thing to use it. No overlay, no invented field, and
 * no change to the API contract.
 *
 * ── "driver" is the backend's word; the product says chauffeur ─────────────
 * The same rule the trip statuses follow: the KEY stays as the backend defines
 * it, the LABEL a person reads says chauffeur. Blacklane and Wheely say
 * chauffeur; Uber says driver, and the distinction is the whole brand.
 *
 * ── Accounts are created by the operator ──────────────────────────────────
 * There is no public sign-up for a chauffeur and no "become a driver" flow.
 * A chauffeur business adds its own chauffeurs — the client's own panel has a
 * Chauffeurs section where exactly that happens. An account whose role is
 * `customer` can reach none of this, and there is no route that grants it.
 */

/** What the app does with an account, as opposed to what the backend calls it. */
export type AccountKind = 'customer' | 'chauffeur' | 'operator';

/**
 * `corporate_admin` is a CUSTOMER.
 *
 * They book rides for a company and manage its travellers; they do not drive
 * and they do not dispatch. Mapping them anywhere else would put a corporate
 * booker into an operations console because their title contains the word
 * admin, which is exactly the kind of mistake a role map exists to prevent.
 */
export function accountKindFor(role: UserRole): AccountKind {
  switch (role) {
    case 'driver':
      return 'chauffeur';
    case 'admin':
      return 'operator';
    case 'customer':
    case 'corporate_admin':
      return 'customer';
  }
}

export function accountKindOf(profile: Profile | null): AccountKind {
  // No profile is a customer. Defaulting the other way would show a signed-out
  // visitor an operations console for the length of one render.
  if (!profile) return 'customer';
  return accountKindFor(profile.role);
}

/**
 * The route an account lands on after sign-in.
 *
 * ── Why the role destinations are still behind the demo fence ─────────────
 * `app/_role/` is stripped from any build made without `EXPO_PUBLIC_DEMO_MODE`,
 * by `resolver.blockList` in `metro.config.js`, and the absence is verified
 * against the emitted bundle rather than assumed.
 *
 * That fence stays for now, and it is not a contradiction of "the role is
 * real". The role IS real — it is a backend field this function reads. What is
 * still a demonstration is the CONTENT behind it: the jobs on a chauffeur's
 * board are seeded demo bookings, not a schedule. Shipping the screens to a
 * production build would put a convincing empty product in front of whoever
 * signed in, and a role that looks complete and is not connected is the most
 * misreadable thing this app could contain.
 *
 * When there is a backend, the fence comes off and this function does not
 * change.
 */
export function landingRouteFor(kind: AccountKind, staffSurfacesAvailable = isDemoMode): string {
  /*
   * ── A BUG FOUND BY MEASURING THE FENCE, NOT BY READING THIS FILE ─────────
   * The first version returned the `_role` paths unconditionally. Grepping a
   * build made with `EXPO_PUBLIC_DEMO_MODE=false` showed the screens correctly
   * absent — and the route STRINGS still present, because this function
   * contains them.
   *
   * A path string naming a route that is not in the bundle resolves to the
   * not-found screen. So a chauffeur or an operator signing into a production
   * build would have landed on a 404, which is worse than any of the options.
   *
   * They land in the customer app instead. That is not pretending they are
   * customers — it is the only surface that exists in that build, they can
   * still book a car with it, and `hasStaffRole()` still reports the truth for
   * anything that wants to branch on it. The alternative, a designed "not
   * available in this build" screen, is a better answer and needs a decision
   * about what it should say; a 404 needs no decision to be wrong.
   */
  if (!staffSurfacesAvailable) return '/(app)';
  switch (kind) {
    case 'chauffeur':
      return '/_role/chauffeur';
    case 'operator':
      return '/_role/admin';
    case 'customer':
      return '/(app)';
  }
}

/** True when this account may reach the chauffeur or operator surfaces at all. */
export function hasStaffRole(profile: Profile | null): boolean {
  return accountKindOf(profile) !== 'customer';
}

/**
 * What a chauffeur is shown about money: NOTHING.
 *
 * Not a zero, not a placeholder, not an empty row where a figure would go. The
 * space is left out entirely.
 *
 * Whether a chauffeur may see what a job pays is a business decision with
 * employment and contracting consequences. Neither `lctuniversal.com` — read in
 * full on 2026-08-26, including `/join-our-team` — nor the client's operations
 * panel answers it. `OPEN_QUESTIONS.md` question 8.
 *
 * Exported as a named constant rather than left as an absence, so that anyone
 * adding a fare to a chauffeur screen finds the reason before they add it.
 */
export const CHAUFFEUR_SEES_FARES = false;

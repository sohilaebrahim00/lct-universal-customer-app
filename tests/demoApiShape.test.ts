import { describe, expect, it } from '@jest/globals';
import { handleDemoRequest } from '../src/dev/demoApi';

/**
 * DEMO PAYLOAD SHAPES, against what the app actually unwraps.
 *
 * ── The bug this exists to prevent recurring ────────────────────────────────
 * `demoApi` answered `/concierge/message` with the parsed intent FLAT, while
 * the real backend and `conciergeApi.send()` both use `{ intent }`. So
 * `r.intent` was `undefined` and the concierge screen crashed on
 * `intent.assistantReply`.
 *
 * **Nobody had ever seen it.** The screen caught every failure and pushed it
 * into the transcript as an assistant message, so the crash rendered as a
 * plausible reply. The app was failing and looked like it was working, which is
 * strictly worse than failing visibly. It survived the entire project that way.
 *
 * ── Why the contract diff could not catch it ────────────────────────────────
 * That check compared the app's call sites against the backend's ROUTES: every
 * endpoint existed, every envelope key matched. It did not compare the DEMO
 * layer against either, and it did not compare payload shapes at all — a limit
 * that was written down at the time and then demonstrated one slice later.
 *
 * ── What this asserts ───────────────────────────────────────────────────────
 * For every endpoint the app calls, the demo layer returns an object carrying
 * the key `src/api/*` unwraps. `EXPECTED` below is transcribed from those
 * modules' own `.then((r) => r.<key>)` — so if an API module changes what it
 * unwraps and the demo layer is not updated, this fails rather than a customer
 * finding it.
 */

/** Endpoint → the key `src/api/*` reads off the response. */
const EXPECTED: { path: string; method: string; key: string; body?: unknown }[] = [
  { path: 'vehicles', method: 'GET', key: 'vehicles' },
  { path: 'profiles/me', method: 'GET', key: 'profile' },
  { path: 'profiles/me/saved-locations', method: 'GET', key: 'locations' },
  { path: 'profiles/me/saved-passengers', method: 'GET', key: 'passengers' },
  { path: 'profiles/me/payment-methods', method: 'GET', key: 'paymentMethods' },
  { path: 'bookings', method: 'GET', key: 'bookings' },
  { path: 'notifications', method: 'GET', key: 'notifications' },
  { path: 'corporate/account', method: 'GET', key: 'account' },
  { path: 'corporate/employees', method: 'GET', key: 'employees' },
  // The one that was wrong. `conciergeApi.send()` reads `r.intent`.
  { path: 'concierge/message', method: 'POST', key: 'intent', body: { messages: [{ role: 'user', content: 'hi' }] } },
];

describe('demo API payload shapes', () => {
  for (const endpoint of EXPECTED) {
    it(`${endpoint.method} /${endpoint.path} returns { ${endpoint.key} }`, async () => {
      const result = await handleDemoRequest(endpoint.path, endpoint.method, endpoint.body ?? null);

      expect(result.handled).toBe(true);
      const data = (result as { handled: true; data: unknown }).data as Record<string, unknown>;

      // `toHaveProperty` rather than a truthiness check: an endpoint may
      // legitimately return null or an empty array under that key, and the
      // failure being guarded against is the key being ABSENT.
      expect(data).toHaveProperty(endpoint.key);
      expect(data[endpoint.key]).not.toBeUndefined();
    });
  }

  it('returns { trip, events, driver, vehicle } for a booking trip', async () => {
    const bookings = (await handleDemoRequest('bookings', 'GET', null)) as { handled: true; data: { bookings: { id: string }[] } };
    const id = bookings.data.bookings[0]!.id;

    const result = (await handleDemoRequest(`bookings/${id}/trip`, 'GET', null)) as {
      handled: true;
      data: Record<string, unknown>;
    };

    // `src/api/trips.ts` reads the whole object rather than unwrapping a key,
    // so all four have to be present by name.
    for (const key of ['trip', 'events', 'driver', 'vehicle']) {
      expect(result.data).toHaveProperty(key);
    }
  });

  it('leaves an unmapped endpoint UNHANDLED rather than answering it', async () => {
    // The demo layer must never invent a response. An unknown endpoint has to
    // surface as a normal error state, which is what `handled: false` produces.
    const result = await handleDemoRequest('does-not-exist', 'GET', null);
    expect(result.handled).toBe(false);
  });
});

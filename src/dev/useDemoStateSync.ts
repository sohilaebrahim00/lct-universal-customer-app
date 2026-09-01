import { useEffect } from 'react';
import { isDemoMode } from '../lib/env';
import { adoptPersistedState } from './demoApi';
import { onDemoStateChanged } from './demoSync';

/**
 * Re-reads the demo store and re-runs `onChange` when another tab changes it.
 *
 * ── Additive by construction ───────────────────────────────────────────────
 * Every screen that uses this already reloads on focus, and that path is
 * untouched. This adds a second trigger; it does not replace the first. A
 * browser without `BroadcastChannel` or `storage` events — and native, which
 * has neither — behaves exactly as it did before.
 *
 * Outside demo mode it subscribes to nothing at all. There is no shared store
 * to watch when the app is talking to a real backend, and the day there is, the
 * mechanism is a socket rather than this.
 *
 * ── What it is NOT ────────────────────────────────────────────────────────
 * Cross-device sync. Two tabs of one browser, one machine. Two phones still do
 * not talk to each other — that is G-3 and is unchanged.
 */
export function useDemoStateSync(onChange: () => void): void {
  useEffect(() => {
    if (!isDemoMode) return;
    return onDemoStateChanged(() => {
      // Pick the change up before telling the screen to re-read, or it would
      // re-render the same in-memory data it already had.
      adoptPersistedState();
      onChange();
    });
  }, [onChange]);
}

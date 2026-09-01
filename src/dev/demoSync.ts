/**
 * TELLING THE OTHER TAB, WITHOUT A SERVER.
 *
 * The best moment in the demo is the chauffeur marking arrived and the
 * passenger's screen saying the car is outside. Until now that moment needed
 * the words "reload the other tab", which turns the strongest thing in the
 * product into an apology.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  THIS IS NOT CROSS-DEVICE SYNC AND MUST NEVER BE DESCRIBED AS ONE.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `BroadcastChannel` and the `storage` event both work between **tabs of one
 * browser on one machine**. Two phones still will not sync. That is still
 * `BACKEND_FOLLOWUPS.md` G-3 — `driver_locations` is never written during a
 * trip and there is no channel between devices — and nothing here changes it.
 *
 * What this is: real, for exactly the case the demo runs in. A demo driven from
 * two tabs on one laptop is not a simulation of that case, it IS that case.
 *
 * ── Purely additive ────────────────────────────────────────────────────────
 * Nothing about how state is written or persisted changes. `persist()` still
 * writes the same JSON to the same key; it now also says so out loud. Every
 * screen keeps its existing focus-triggered reload, so a browser with neither
 * mechanism behaves exactly as it did before — which is also what native does,
 * where both are absent.
 *
 * ── Two mechanisms, and why both ──────────────────────────────────────────
 * `BroadcastChannel` is the direct one and fires in the same tab's siblings
 * immediately. The `storage` event is the fallback and costs nothing extra: it
 * already fires in *other* tabs whenever `localStorage` is written, so the
 * demo has been broadcasting this all along with nobody listening.
 */

const CHANNEL_NAME = 'lct-universal:demo-state';

/** The key `demoApi` persists under. Watched so the storage fallback can filter. */
export const DEMO_STATE_STORAGE_KEY = 'lct-universal:demo-state:v1';

function channel(): BroadcastChannel | null {
  try {
    if (typeof BroadcastChannel === 'undefined') return null;
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    // Some privacy modes throw on construction rather than being absent.
    return null;
  }
}

/**
 * Announces that the demo store changed. Safe to call anywhere, including
 * native, where it does nothing.
 */
export function notifyDemoStateChanged(): void {
  const c = channel();
  if (!c) return;
  try {
    c.postMessage({ at: Date.now() });
  } catch {
    // A closed or unavailable channel is not worth failing a write over.
  } finally {
    try {
      c.close();
    } catch {
      /* nothing to do */
    }
  }
}

/**
 * Subscribes to changes made in another tab. Returns an unsubscribe function.
 *
 * The callback fires only for changes from ELSEWHERE: `BroadcastChannel` does
 * not deliver a tab its own messages, and the `storage` event only fires in
 * other documents. So a tab never reacts to its own write, which would loop.
 */
export function onDemoStateChanged(handler: () => void): () => void {
  const disposers: (() => void)[] = [];

  const c = channel();
  if (c) {
    const onMessage = () => handler();
    c.addEventListener('message', onMessage);
    disposers.push(() => {
      c.removeEventListener('message', onMessage);
      try {
        c.close();
      } catch {
        /* nothing to do */
      }
    });
  }

  // The fallback. Present even when BroadcastChannel is, and harmless: a tab
  // that receives both simply reloads twice from the same storage.
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === DEMO_STATE_STORAGE_KEY) handler();
    };
    window.addEventListener('storage', onStorage);
    disposers.push(() => window.removeEventListener('storage', onStorage));
  }

  return () => {
    for (const d of disposers) d();
  };
}

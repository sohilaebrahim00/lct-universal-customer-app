import { create } from 'zustand';

/**
 * CONNECTIVITY, derived from what the app actually experiences.
 *
 * ── Why not `expo-network` ──────────────────────────────────────────────────
 * It is not installed, and adding a dependency needs asking. But the better
 * reason is that it answers a slightly different question: `expo-network` tells
 * you whether the device has a network interface up, and this app needs to know
 * whether it can reach ITS API. A phone on hotel wifi behind a captive portal
 * reports a perfectly healthy connection and cannot reach anything.
 *
 * So connectivity is inferred from request outcomes at the single fetch
 * boundary (`src/lib/apiClient.ts`): a NETWORK-level failure — not an HTTP
 * status — marks the app offline, and the next success marks it back online.
 * That is the exact condition the banner is claiming, measured directly.
 *
 * On web this is supplemented by `navigator.onLine`, which is free and instant:
 * it flips the moment the interface drops rather than waiting for a request to
 * fail. It is only ever used to go OFFLINE early — `navigator.onLine === true`
 * famously means "an interface exists", not "the internet works", so it never
 * gets to declare the app online on its own.
 *
 * **If true OS-level detection is wanted later, `expo-network` is the upgrade**
 * and this is the one module that would change.
 */

interface ConnectivityState {
  online: boolean;
  /** When the app last successfully reached the API. Null until it has. */
  lastOkAt: number | null;
  /** A network-level failure — a dead host, no route, a captive portal. */
  reportNetworkFailure: () => void;
  /** Any successful API response. */
  reportSuccess: () => void;
  /** Web only: the interface went away. Never used to declare online. */
  reportInterfaceOffline: () => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  // Optimistic: an app that opens claiming to be offline, before it has tried
  // anything, is wrong more often than it is right.
  online: true,
  lastOkAt: null,

  reportNetworkFailure: () => set((s) => (s.online ? { online: false } : s)),
  reportSuccess: () => set({ online: true, lastOkAt: Date.now() }),
  reportInterfaceOffline: () => set((s) => (s.online ? { online: false } : s)),
}));

/**
 * Called from the fetch boundary. Kept as plain functions rather than hooks so
 * `apiClient` — which is not a component — can use them.
 */
export const connectivity = {
  networkFailure: () => useConnectivityStore.getState().reportNetworkFailure(),
  success: () => useConnectivityStore.getState().reportSuccess(),
  interfaceOffline: () => useConnectivityStore.getState().reportInterfaceOffline(),
};

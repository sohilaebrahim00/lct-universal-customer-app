/**
 * THE MAPS JAVASCRIPT API, LOADED ONCE, ON THE ONE SCREEN THAT NEEDS IT.
 *
 * ── Why a script tag and not a package ────────────────────────────────────
 * `react-native-maps` has no web implementation, and every wrapper library for
 * the Maps JS API is a new dependency plus a second map style to keep in sync.
 * The API itself is a script tag. So this adds **no package**, and the web map
 * reuses `MAP_STYLE_NIGHT` — the same array both native maps already pass to
 * `customMapStyle`, so there is one style in this project rather than two that
 * agree today.
 *
 * ── Loaded lazily, per §52 ────────────────────────────────────────────────
 * Nothing imports this at module scope. The tracking screen calls `loadMaps()`
 * when it mounts, so the ~200 KB of Maps JS is fetched by the one screen that
 * renders a map and never by the booking flow, the trips list or the console.
 *
 * ── Every failure mode is a value, not an exception ───────────────────────
 * A map that fails must degrade to the designed placeholder, never to a blank
 * frame or an uncaught error. So this resolves to a tagged result and the
 * caller renders accordingly:
 *
 *   `unconfigured`  no browser key in the environment
 *   `auth-failed`   the key was rejected or its referrer restriction blocked us
 *   `load-failed`   the script did not load at all (offline, blocked, timeout)
 *   `ready`         `window.google.maps` is usable
 *
 * `auth-failed` is the one that would otherwise be silent: Google does not
 * reject the promise for a bad key. It renders a grey tile grid and calls
 * `window.gm_authFailure`. That callback is installed here so a restricted or
 * expired key produces an honest fallback instead of a broken-looking map —
 * which matters because the key is restricted by HTTP referrer, so it works in
 * development and can fail only in production if the domain list is wrong.
 */
import { env, isMapsConfigured } from '../../lib/env';

export type MapsLoadResult = 'ready' | 'unconfigured' | 'auth-failed' | 'load-failed';

/** Resolved once and shared — a second caller never injects a second script. */
let pending: Promise<MapsLoadResult> | null = null;
let authFailed = false;

const SCRIPT_ID = 'lct-google-maps-js';
/** Generous, but bounded: a hung request must not leave the map "loading" forever. */
const TIMEOUT_MS = 12_000;

export function loadMaps(): Promise<MapsLoadResult> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve('load-failed');
  }
  if (!isMapsConfigured) return Promise.resolve('unconfigured');
  if (authFailed) return Promise.resolve('auth-failed');

  const w = window as unknown as { google?: { maps?: unknown }; gm_authFailure?: () => void };
  if (w.google?.maps) return Promise.resolve('ready');
  if (pending) return pending;

  pending = new Promise<MapsLoadResult>((resolve) => {
    /*
     * Google calls this instead of failing the load when the key is invalid,
     * unauthorised for this referrer, or over quota. Without it the page shows
     * Google's own grey "for development purposes only" tiles, which is a
     * broken map that reports success.
     */
    w.gm_authFailure = () => {
      authFailed = true;
      resolve('auth-failed');
    };

    const timer = setTimeout(() => resolve('load-failed'), TIMEOUT_MS);

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => {
        clearTimeout(timer);
        resolve(authFailed ? 'auth-failed' : 'ready');
      });
      existing.addEventListener('error', () => {
        clearTimeout(timer);
        resolve('load-failed');
      });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    /*
     * `loading=async` is Google's own recommendation and silences its console
     * warning. No `libraries=` — this map needs only the core: markers and a
     * bounds fit. Places autocomplete is a separate, server-side call in
     * `googlePlaces.ts` and does not want the client library.
     */
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    )}&loading=async&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      clearTimeout(timer);
      resolve(authFailed ? 'auth-failed' : 'ready');
    };
    script.onerror = () => {
      clearTimeout(timer);
      resolve('load-failed');
    };
    document.head.appendChild(script);
  });

  return pending;
}

/** Test seam: forgets the cached load so a new environment can be exercised. */
export function resetMapsLoaderForTests(): void {
  pending = null;
  authFailed = false;
}

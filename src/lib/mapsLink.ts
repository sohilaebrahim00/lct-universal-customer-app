/**
 * NAVIGATION HANDS OFF TO THE PHONE'S OWN MAPS APP.
 *
 * No turn-by-turn inside this app. A chauffeur already has a navigation app
 * they trust and a mount they use it in; building routing in here would be a
 * large piece of work to produce a worse version of something they have. The
 * same reasoning as `tel:` and `sms:` on the job screen — the OS handler is the
 * right answer and needs no decision from anybody.
 *
 * ── Why the platform is a parameter ────────────────────────────────────────
 * This started inside `ChauffeurJob.tsx` reading `Platform.OS` directly, and a
 * test importing it pulled React Native into a node environment and failed to
 * run at all. A URL builder is arithmetic on a string; it does not need to be
 * in a component, and taking the platform as an argument is what makes it
 * testable without a renderer.
 *
 * ── Address, not coordinates ───────────────────────────────────────────────
 * A booking always carries an address string. It may carry NULL coordinates —
 * the manual-entry fallback, used when there is no Maps key or on web, reports
 * no lat/lng at all. Building the link from coordinates would work in the happy
 * path and open an empty map at the exact moment the app had degraded.
 */
export type MapsPlatform = 'ios' | 'android' | 'web' | string;

export function mapsUrlFor(address: string, platform: MapsPlatform): string {
  const q = encodeURIComponent(address);
  // iOS answers `maps:`, Android answers `geo:`. A browser answers neither, so
  // the web preview falls back to a URL every browser can open.
  if (platform === 'ios') return `maps:0,0?q=${q}`;
  if (platform === 'android') return `geo:0,0?q=${q}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

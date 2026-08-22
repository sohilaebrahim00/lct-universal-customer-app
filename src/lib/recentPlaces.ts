import type { Booking, SavedLocation } from '../types/api';

/**
 * RECENT PLACES, derived from the customer's own bookings.
 *
 * There is no recents endpoint — `BACKEND_FOLLOWUPS.md` §4 records the gap and
 * the one-line `GET /profiles/me/recent-locations` that would close it. Until
 * then this reconstructs them from `GET /bookings`, which the app already
 * fetches, so a customer who books the same three places sees those three
 * places without a round trip.
 *
 * **The honest limit:** this can only see the page of bookings the client
 * happens to hold. A customer whose last trip to a given address falls outside
 * that page will not see it here. That is a smaller problem than it sounds —
 * recents are a convenience, and search still finds everything — but it is why
 * the endpoint is still worth adding rather than declaring this the solution.
 */

export interface RecentPlace {
  /** Stable across renders: the normalised address is the identity. */
  id: string;
  address: string;
  lat: number | null;
  lng: number | null;
  /** The most recent booking that used it. Sorts the list. */
  lastUsedAt: string;
}

/** Trailing punctuation and casing differ between geocoder responses for one place. */
function normalise(address: string): string {
  return address.trim().replace(/\s+/g, ' ').replace(/[.,]+$/, '').toLowerCase();
}

/**
 * The most recently used distinct places from a customer's bookings.
 *
 * Both ends of every journey count: a customer who was driven TO an address
 * last week is as likely to be going there again as one who was collected from
 * it, and treating drop-offs as unusable would drop most airport runs.
 *
 * `exclude` removes places already shown as saved, so the sheet never lists the
 * same address twice under two headings.
 */
export function recentPlacesFrom(
  bookings: Booking[],
  options: { limit?: number; exclude?: SavedLocation[] } = {},
): RecentPlace[] {
  const limit = options.limit ?? 4;
  const savedPlaces = options.exclude ?? [];
  const excluded = new Set(savedPlaces.map((l) => normalise(l.address)));

  /**
   * The same place can be written two ways.
   *
   * A saved "DFW Terminal D" stored as `2337 S International Pkwy, DFW Airport,
   * TX` and a booking's `DFW Terminal D, DFW Airport, TX` are one location and
   * two strings, so string matching alone listed it under Saved *and* Recent —
   * exactly the duplication this exclusion exists to prevent. Observed in the
   * demo dataset, which is where two spellings of one airport terminal already
   * coexist.
   *
   * So proximity is the second test: within ~60 m, it is the same kerb. Only
   * applied when both sides actually have coordinates — a manually entered
   * address has none, and there string matching is all there is.
   */
  const savedPoints = savedPlaces
    .filter((l) => l.lat !== null && l.lng !== null && (l.lat !== 0 || l.lng !== 0))
    .map((l) => ({ lat: l.lat as number, lng: l.lng as number }));

  const isNearSaved = (lat: number | null, lng: number | null) => {
    if (lat === null || lng === null || (lat === 0 && lng === 0)) return false;
    // ~60 m in degrees at DFW's latitude. Coarse on purpose: this is
    // "same kerb", not "same coordinate".
    const TOLERANCE = 0.00055;
    return savedPoints.some((p) => Math.abs(p.lat - lat) < TOLERANCE && Math.abs(p.lng - lng) < TOLERANCE);
  };

  const seen = new Map<string, RecentPlace>();

  const sorted = [...bookings].sort(
    (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
  );

  for (const booking of sorted) {
    const ends: { address: string | null; lat: number | null; lng: number | null }[] = [
      { address: booking.pickup_address, lat: booking.pickup_lat, lng: booking.pickup_lng },
      { address: booking.dropoff_address, lat: booking.dropoff_lat, lng: booking.dropoff_lng },
    ];

    for (const end of ends) {
      if (!end.address) continue;
      const key = normalise(end.address);
      if (!key || excluded.has(key) || seen.has(key)) continue;
      if (isNearSaved(end.lat, end.lng)) continue;

      seen.set(key, {
        id: key,
        address: end.address,
        lat: end.lat,
        lng: end.lng,
        lastUsedAt: booking.scheduled_at,
      });

      if (seen.size >= limit) return [...seen.values()];
    }
  }

  return [...seen.values()];
}

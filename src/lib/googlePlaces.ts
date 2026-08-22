import 'react-native-get-random-values';
import { env, isMapsConfigured, isDemoMode } from './env';

/**
 * Thin wrapper around the Google Places / Directions / Geocoding REST APIs
 * — the same "classic" (GET, query-param) endpoints the backend's
 * src/lib/maps.ts already uses, for consistency across both codebases.
 * Every function returns `null`/`[]` (never throws) when
 * EXPO_PUBLIC_GOOGLE_MAPS_API_KEY isn't set, so the location picker falls
 * back to manual text entry instead of crashing — same graceful-
 * degradation contract used everywhere else in this app and the backend.
 */

export function newPlacesSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface PlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
}

export async function autocompletePlaces(
  query: string,
  sessionToken: string,
  bias?: { lat: number; lng: number },
): Promise<PlaceSuggestion[]> {
  if (!isMapsConfigured || query.trim().length < 3) return [];

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', query);
  url.searchParams.set('sessiontoken', sessionToken);
  url.searchParams.set('key', env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!);
  if (bias) {
    url.searchParams.set('location', `${bias.lat},${bias.lng}`);
    url.searchParams.set('radius', '50000');
  }

  const response = await fetch(url.toString());
  if (!response.ok) return [];

  const body = (await response.json()) as {
    predictions?: { place_id: string; structured_formatting: { main_text: string; secondary_text?: string } }[];
  };

  return (body.predictions ?? []).map((p) => ({
    placeId: p.place_id,
    primaryText: p.structured_formatting.main_text,
    secondaryText: p.structured_formatting.secondary_text ?? '',
  }));
}

export interface PlaceDetails {
  formattedAddress: string;
  lat: number;
  lng: number;
}

export async function getPlaceDetails(placeId: string, sessionToken: string): Promise<PlaceDetails | null> {
  if (!isMapsConfigured) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('sessiontoken', sessionToken);
  url.searchParams.set('fields', 'formatted_address,geometry');
  url.searchParams.set('key', env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!);

  const response = await fetch(url.toString());
  if (!response.ok) return null;

  const body = (await response.json()) as {
    result?: { formatted_address: string; geometry: { location: { lat: number; lng: number } } };
  };
  if (!body.result) return null;

  return {
    formattedAddress: body.result.formatted_address,
    lat: body.result.geometry.location.lat,
    lng: body.result.geometry.location.lng,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!isMapsConfigured) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${lat},${lng}`);
  url.searchParams.set('key', env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!);

  const response = await fetch(url.toString());
  if (!response.ok) return null;

  const body = (await response.json()) as { results?: { formatted_address: string }[] };
  return body.results?.[0]?.formatted_address ?? null;
}

/**
 * An address string to a point.
 *
 * The mirror of `reverseGeocode`, and needed for exactly one case: a saved or
 * recent place captured through the manual-entry fallback has an address and no
 * coordinates. Without this, choosing it would commit a booking with a 0,0
 * point — which is what made every such fare price on base rate alone.
 *
 * Returns null when Maps is unconfigured or the address does not resolve. The
 * caller commits by address anyway in that case, which is exactly what the
 * manual path already does.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!isMapsConfigured || !address.trim()) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!);

  const response = await fetch(url.toString());
  if (!response.ok) return null;

  const body = (await response.json()) as { results?: { geometry?: { location?: { lat: number; lng: number } } }[] };
  const point = body.results?.[0]?.geometry?.location;
  return point ? { lat: point.lat, lng: point.lng } : null;
}

export interface RouteInfo {
  distanceMiles: number;
  durationMinutes: number;
  polyline: string;
}

/**
 * Demo mode has no Maps key and therefore no Directions call, which would leave
 * every fare priced on base rate alone. This returns the seeded reference trip
 * so the booking flow quotes a believable number. The reference journey is
 * Uptown Dallas to DFW Terminal D — LCT operates in Dallas-Fort Worth.
 *
 * Seeded, not invented pricing: the DISTANCE is demo data, and the fare is still
 * computed from it by the real pricing function. Named as demo data in
 * DEMO_GUIDE.md.
 */
const DEMO_ROUTE = { distanceMiles: 23.2, durationMinutes: 34, polyline: '' };

export async function getRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<RouteInfo | null> {
  if (isDemoMode) return DEMO_ROUTE;
  if (!isMapsConfigured) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.set('origin', `${origin.lat},${origin.lng}`);
  url.searchParams.set('destination', `${destination.lat},${destination.lng}`);
  url.searchParams.set('units', 'imperial');
  url.searchParams.set('key', env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!);

  const response = await fetch(url.toString());
  if (!response.ok) return null;

  const body = (await response.json()) as {
    routes?: { legs: { distance: { value: number }; duration: { value: number } }[]; overview_polyline: { points: string } }[];
  };
  const route = body.routes?.[0];
  const leg = route?.legs[0];
  if (!route || !leg) return null;

  return {
    distanceMiles: leg.distance.value / 1609.344,
    durationMinutes: leg.duration.value / 60,
    polyline: route.overview_polyline.points,
  };
}

/** Decodes a Google-encoded polyline into an array of lat/lng points for MapView's Polyline component. */
export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

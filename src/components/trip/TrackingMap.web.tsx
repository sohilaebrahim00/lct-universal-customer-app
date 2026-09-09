import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { AppText } from '../ui/Typography';
import { iconSize, iconStroke, space, theme } from '../../theme';
import { distanceMiles } from '../../lib/geo';
import { loadMaps, type MapsLoadResult } from '../maps/googleMapsLoader';
import { MAP_STYLE_NIGHT } from './mapStyle';
import type { TrackingMapProps } from './TrackingMap';

/**
 * WEB — a real Google map when there is a key, and the honest placeholder when
 * there is not.
 *
 * ── What this replaced, and what survived ─────────────────────────────────
 * This file used to be a placeholder only, on the reasoning that
 * `react-native-maps` has no web implementation and a wrapper library would be
 * a new dependency plus a second map style. That reasoning held for the
 * dependency and not for the map: the Maps JS API is a script tag, and
 * `MAP_STYLE_NIGHT` — the array both native maps already pass to
 * `customMapStyle` — applies to it unchanged. So the web map is now real, adds
 * no package, and shares one style with native.
 *
 * **The placeholder survived, and still matters.** No browser key is
 * configured in this workspace, so what renders here today is the fallback.
 * It is not dead code waiting for a key; it is the current behaviour, and it
 * is also what a referrer-restricted key produces on a domain nobody added.
 *
 * ── MARKERS ONLY. There is deliberately no route line ─────────────────────
 * `getRoute()` fetches a genuine Directions `overview_polyline`, but into the
 * BOOKING DRAFT — `routePolyline` is not on `CreateBookingInput`, not on
 * `Booking`, and not on `Trip`. By the time a customer is tracking a ride the
 * draft is gone and no route geometry exists.
 *
 * Drawing a straight line between pickup and drop-off and calling it the route
 * would be a fabrication of exactly the kind this project removes elsewhere: a
 * customer cannot tell a rendered guess from a real one. The native tracking
 * map has always been markers-only for the same reason, and this matches it.
 * If `Trip` ever carries a polyline, this is where it goes.
 *
 * ── Every failure degrades to the same honest screen ──────────────────────
 * No key, a rejected key, a blocked script, no coordinates at all — each lands
 * on the placeholder with a line saying which. The closing distance is real and
 * is shown in every state where a chauffeur position exists, because it is
 * computed from the same smoothed fix the marker would use.
 */

/** The one place the map's own DOM node is described, so RNW cannot restyle it. */
const MAP_DIV_STYLE = { position: 'absolute', inset: 0 } as const;

export function TrackingMap({ chauffeur, pickup, dropoff, phase }: TrackingMapProps) {
  const focus = phase === 'approach' ? pickup : dropoff;
  const milesAway = chauffeur && focus ? distanceMiles(chauffeur, focus) : null;

  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [status, setStatus] = useState<MapsLoadResult | 'loading'>('loading');

  /* Load once per mount. `loadMaps()` itself is idempotent across mounts. */
  useEffect(() => {
    let alive = true;
    loadMaps().then((r) => {
      if (alive) setStatus(r);
    });
    return () => {
      alive = false;
    };
  }, []);

  const haveAnyPoint = Boolean(pickup || dropoff || chauffeur);

  /*
   * Create the map once the API is ready and there is at least one point to
   * show. A map centred on nothing is worse than the placeholder.
   */
  useEffect(() => {
    if (status !== 'ready' || !hostRef.current || !haveAnyPoint) return;
    if (mapRef.current) return;
    mapRef.current = new google.maps.Map(hostRef.current, {
      // Style shared with native — see MAP_STYLE_NIGHT.
      styles: MAP_STYLE_NIGHT as google.maps.MapTypeStyle[],
      disableDefaultUI: true,
      gestureHandling: 'greedy',
      backgroundColor: theme.background.primary,
      zoom: 12,
      center: { lat: pickup?.latitude ?? chauffeur?.latitude ?? 0, lng: pickup?.longitude ?? chauffeur?.longitude ?? 0 },
    });
  }, [status, haveAnyPoint, pickup, chauffeur]);

  /*
   * Markers are rebuilt from the current props on every change and the previous
   * set is removed first. Google markers are not React-managed, so leaving them
   * to garbage collection leaves them ON THE MAP — a chauffeur marker per
   * position update, a trail of cars that were never there.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];

    const place = (p: { latitude: number; longitude: number }, title: string, colour: string, scale: number) => {
      markersRef.current.push(
        new google.maps.Marker({
          map,
          position: { lat: p.latitude, lng: p.longitude },
          title,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale,
            fillColor: colour,
            fillOpacity: 1,
            strokeColor: theme.background.primary,
            strokeWeight: 2,
          },
        }),
      );
    };

    if (pickup) place(pickup, 'Pickup', theme.content.secondary, 6);
    if (dropoff) place(dropoff, 'Destination', theme.content.secondary, 6);
    if (chauffeur) place(chauffeur, 'Your chauffeur', theme.content.accent, 8);

    /*
     * Frame the pair that matters for the phase — approaching, the customer
     * needs to see the car closing on them; in trip, the road ahead. Same rule
     * the native map applies, and the reason `phase` is a prop at all.
     */
    const framed = [phase === 'approach' ? pickup : dropoff, chauffeur].filter(Boolean) as {
      latitude: number;
      longitude: number;
    }[];
    if (framed.length >= 2) {
      const bounds = new google.maps.LatLngBounds();
      for (const p of framed) bounds.extend({ lat: p.latitude, lng: p.longitude });
      map.fitBounds(bounds, 64);
    } else if (framed.length === 1) {
      map.setCenter({ lat: framed[0]!.latitude, lng: framed[0]!.longitude });
      map.setZoom(14);
    }
  }, [status, pickup, dropoff, chauffeur, phase]);

  /* Markers removed on unmount; the shared script is deliberately left cached. */
  useEffect(
    () => () => {
      for (const m of markersRef.current) m.setMap(null);
      markersRef.current = [];
      mapRef.current = null;
    },
    [],
  );

  if (status === 'ready' && haveAnyPoint) {
    return (
      <View style={styles.fill}>
        {/* A real DOM node under React Native Web — the map draws into this. */}
        <div ref={hostRef} style={MAP_DIV_STYLE} aria-label="Map showing your chauffeur and pickup" />
        {milesAway !== null ? (
          <View style={styles.badge} pointerEvents="none">
            <AppText variant="captionSm" accessibilityLiveRegion="polite">
              {`${milesAway.toFixed(1)} mi ${phase === 'approach' ? 'away' : 'remaining'}`}
            </AppText>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <View style={styles.centre}>
        <MapPin size={iconSize.lg} color={theme.content.tertiary} strokeWidth={iconStroke.decorative} />
        <AppText variant="caption" center style={styles.line}>
          {fallbackLine(status, haveAnyPoint)}
        </AppText>
        {milesAway !== null ? (
          <AppText variant="subheading" center style={styles.distance} accessibilityLiveRegion="polite">
            {`${milesAway.toFixed(1)} mi ${phase === 'approach' ? 'away' : 'remaining'}`}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

/**
 * One sentence per real failure, and none of them blames the customer.
 *
 * Deliberately vague about WHY a key was rejected: "check your referrer
 * restrictions" is an instruction for whoever operates the site, and it belongs
 * in `HANDOFF.md`, not on a passenger's screen while their car is arriving.
 */
function fallbackLine(status: MapsLoadResult | 'loading', haveAnyPoint: boolean): string {
  if (!haveAnyPoint) return 'We do not have a position for this ride yet.';
  switch (status) {
    case 'loading':
      return 'Loading the map…';
    case 'unconfigured':
      return 'The live map is available in the iOS and Android app.';
    case 'auth-failed':
    case 'load-failed':
      return 'The map could not be loaded. Everything else on this screen is live.';
    default:
      return 'The live map is available in the iOS and Android app.';
  }
}

const styles = StyleSheet.create({
  // Same ground as the native map's land colour, so the sheet floats over the
  // same tone on both platforms.
  fill: { ...(StyleSheet.absoluteFill as object), backgroundColor: theme.background.primary },
  /*
   * Clears the sheet, which occupies the lower 62% of the screen.
   *
   * NOT a percentage padding: `paddingBottom: '58%'` resolves against the
   * containing block's WIDTH in React Native as in CSS, so it was 835px at
   * 1440 wide and pushed this content above the fold. See the a11y gate's
   * `offscreenAbove()`, which is the check that caught it.
   */
  centre: { position: 'absolute', left: 0, right: 0, top: '18%', alignItems: 'center', paddingHorizontal: space.xl },
  line: { marginTop: space.smd, maxWidth: 280 },
  distance: { marginTop: space.xs },
  /* The closing distance stays readable over a real map, not only the placeholder. */
  badge: {
    position: 'absolute',
    top: space.md,
    alignSelf: 'center',
    paddingHorizontal: space.smd,
    paddingVertical: space.xs,
    borderRadius: 999,
    backgroundColor: 'rgba(2,2,1,0.72)',
    borderWidth: 1,
    borderColor: theme.border.hairline,
  },
});

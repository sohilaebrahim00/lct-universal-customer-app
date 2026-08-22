import { StyleSheet, View } from 'react-native';
import type { LatLng } from '../../lib/geo';
import { regionContaining } from '../../lib/geo';
import { theme } from '../../theme';
import { MAP_STYLE_NIGHT } from './mapStyle';

export interface TrackingMapProps {
  /** The chauffeur, already smoothed. Null before the first fix. */
  chauffeur: LatLng | null;
  /** Compass degrees the marker points. */
  bearing: number;
  pickup: LatLng | null;
  dropoff: LatLng | null;
  /**
   * Which pair the camera frames. Before pickup the customer needs to see the
   * car closing on them; after, they need the road ahead.
   */
  phase: 'approach' | 'in-trip';
}

/**
 * THE MAP IS THE SCREEN.
 *
 * Full bleed, edge to edge, with the sheet floating over it. It used to be a
 * 200pt card in a scroll view with a fixed `latitudeDelta: 0.02` — which framed
 * a 23-mile airport run exactly as tightly as a one-mile hop, and put the
 * chauffeur off screen on the former.
 *
 * ── The camera follows, it does not snap ────────────────────────────────────
 * `animateToRegion` over `CAMERA_MS`, never `setState` on the region. A camera
 * that jumps on every location frame is the same defect as a marker that jumps,
 * one level up, and it is more disorienting because the whole world moves.
 *
 * Framing changes with the phase:
 *   approach  — chauffeur + pickup, so the closing distance is the subject
 *   in-trip   — chauffeur + destination, so the road ahead is
 *
 * ── Native only ─────────────────────────────────────────────────────────────
 * `react-native-maps` is required lazily, inside render, so its native binding
 * is never touched in Expo Go or on web. `TrackingMap.web.tsx` is the
 * counterpart. Same pattern as Stripe and the date picker.
 */

const CAMERA_MS = 900;

export function TrackingMap({ chauffeur, bearing, pickup, dropoff, phase }: TrackingMapProps) {
  /* eslint-disable @typescript-eslint/no-require-imports -- lazy native load, see above. */
  const Maps = require('react-native-maps') as typeof import('react-native-maps');
  const { default: MapView, Marker, MarkerAnimated, PROVIDER_GOOGLE } = Maps;
  const { useEffect, useMemo, useRef } = require('react') as typeof import('react');
  /* eslint-enable @typescript-eslint/no-require-imports */

  const mapRef = useRef<InstanceType<typeof MapView> | null>(null);

  const focus = phase === 'approach' ? pickup : dropoff;
  const region = useMemo(
    () => regionContaining([chauffeur, focus].filter(Boolean) as LatLng[]),
    [chauffeur, focus],
  );

  useEffect(() => {
    if (!region || !mapRef.current) return;
    mapRef.current.animateToRegion(region, CAMERA_MS);
  }, [region]);

  return (
    <View style={styles.fill}>
      <MapView
        ref={mapRef}
        style={styles.fill}
        /*
         * GOOGLE ON BOTH PLATFORMS.
         *
         * Apple Maps ignores `customMapStyle` entirely, so without this the
         * iOS tracking screen rendered in Apple's own theme — a default map
         * surface inside a near-black champagne-and-gold app, on the one screen
         * where the customer is watching hardest and the map IS the product.
         * That is not a small inconsistency; it is the brand disappearing at
         * the worst possible moment.
         *
         * The intent was always Google on both: `app.config.ts` has declared
         * `ios.config.googleMapsApiKey` since the project started. The provider
         * was simply never selected.
         *
         * Two things this costs, both reported rather than assumed:
         *   1. The Google Maps iOS SDK adds binary weight. NOT MEASURED — there
         *      has been no EAS build in this environment. Measure at the first
         *      one.
         *   2. `GOOGLE_MAPS_API_KEY_IOS` is unset, so on iOS this is inert
         *      until a real key exists: the map renders blank rather than
         *      falling back to Apple. `isMapsConfigured()` already gates the
         *      screens that can degrade to manual entry.
         */
        provider={PROVIDER_GOOGLE}
        // The warm near-black style, so the map belongs to this app rather than
        // looking like a Google product embedded in it.
        customMapStyle={MAP_STYLE_NIGHT}
        initialRegion={region ?? undefined}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        // The sheet covers the lower half; keep Google's attribution above it.
        mapPadding={{ top: 0, right: 0, bottom: 260, left: 0 }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {pickup ? <Marker coordinate={pickup} title="Pickup" pinColor={theme.content.secondary} /> : null}
        {dropoff ? <Marker coordinate={dropoff} title="Destination" pinColor={theme.content.secondary} /> : null}

        {chauffeur ? (
          <MarkerAnimated
            coordinate={chauffeur}
            // The marker itself is rotated, not the map. Rotating the map to
            // the vehicle's heading is a driver-app idiom; a passenger needs
            // north to stay put or they lose their own bearings.
            rotation={bearing}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            title="Your chauffeur"
          >
            <View style={styles.puck}>
              <View style={styles.puckNose} />
            </View>
          </MarkerAnimated>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill as object },
  /*
   * A directional puck rather than a pin. A pin points at the ground and says
   * nothing about which way the car is facing; the whole reason bearing is
   * computed is so this shape can carry it.
   */
  puck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.content.accent,
    borderWidth: 2,
    borderColor: theme.content.onAccent,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  puckNose: {
    width: 0,
    height: 0,
    marginTop: -6,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: theme.content.accent,
  },
});

import { StyleSheet } from 'react-native';
import type { Region } from 'react-native-maps';
import type { RefObject } from 'react';
import { MAP_STYLE_NIGHT } from '../trip/mapStyle';
import { theme } from '../../theme';
import type { LatLng } from '../../lib/geo';

export interface PickerMapHandle {
  animateToRegion: (region: Region, duration?: number) => void;
}

interface Props {
  mapRef: RefObject<PickerMapHandle | null>;
  region: Region;
  /** The journey's other end. When set, the route is drawn and both are framed. */
  origin: LatLng | null;
  /** Wherever the centre pin currently is. */
  target: LatLng;
  onRegionChange: () => void;
  onRegionChangeComplete: (region: Region) => void;
}

/**
 * The picker's map.
 *
 * Lazily required, inside render, so the native binding is never touched on web
 * or in Expo Go — the caller has already decided not to render this at all in
 * those cases, and this is the second belt.
 *
 * ── The same style as the tracking screen ───────────────────────────────────
 * `MAP_STYLE_NIGHT`, deliberately shared rather than duplicated. Two map styles
 * in one app drift, and the booking flow and the tracking screen are the two
 * places a customer sees a map — the seam between them would be obvious.
 *
 * ── The route, when there is one ────────────────────────────────────────────
 * A straight line, not a driven route: this is a picker, and the customer is
 * still choosing where the line ends. The exact route is computed once on
 * confirmation (`getRoute`) and drawn on the tracking screen. Showing a
 * turn-by-turn path that changes with every pan would cost a Directions call
 * per frame for a line nobody is following yet.
 *
 * The glow is two polylines: a wide, low-opacity champagne stroke under a
 * narrow solid one. `react-native-maps` has no shadow on a polyline, so the
 * halo has to be drawn rather than styled.
 */
export function NativePickerMap({
  mapRef,
  region,
  origin,
  target,
  onRegionChange,
  onRegionChangeComplete,
}: Props) {
  /* eslint-disable @typescript-eslint/no-require-imports -- lazy native load, see above. */
  const Maps = require('react-native-maps') as typeof import('react-native-maps');
  const { default: MapView, Marker, Polyline, PROVIDER_GOOGLE } = Maps;
  const { useEffect } = require('react') as typeof import('react');
  /* eslint-enable @typescript-eslint/no-require-imports */

  /**
   * `fitToCoordinates`, not a hand-rolled delta.
   *
   * The old picker framed every journey at `latitudeDelta: 0.01` — the same
   * zoom for a one-mile hop and a twenty-three-mile airport run, so on the
   * latter the other end of the journey was simply off screen. `fitToCoordinates`
   * takes the padding as an inset and works the zoom out itself, which is both
   * correct and less code.
   *
   * Only fires when there IS a second point. While the customer is still
   * choosing, refitting on every pan would fight their gestures.
   */
  useEffect(() => {
    if (!origin || !mapRef.current) return;
    const map = mapRef.current as unknown as {
      fitToCoordinates?: (coords: LatLng[], opts: { edgePadding: { top: number; right: number; bottom: number; left: number }; animated: boolean }) => void;
    };
    map.fitToCoordinates?.([origin, target], {
      // Bottom clears the sheet; top clears the search field.
      edgePadding: { top: 140, right: 60, bottom: 380, left: 60 },
      animated: true,
    });
    // Framed against the ORIGIN only. Including `target` would refit on every
    // pan, which is the fighting-the-gesture problem described above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin]);

  return (
    <MapView
      ref={mapRef as never}
      style={StyleSheet.absoluteFill}
      // Google on both platforms, so the custom style applies on iOS too.
      // See TrackingMap.tsx for the full reasoning and its two caveats.
      provider={PROVIDER_GOOGLE}
      customMapStyle={MAP_STYLE_NIGHT}
      initialRegion={region}
      onRegionChange={onRegionChange}
      onRegionChangeComplete={onRegionChangeComplete}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
    >
      {origin ? (
        <>
          <Marker coordinate={origin} title="Pickup" pinColor={theme.content.secondary} />
          {/* The glow: wide and faint, under the line. */}
          <Polyline
            coordinates={[origin, target]}
            strokeWidth={10}
            strokeColor={theme.accent.routeGlow}
            lineCap="round"
          />
          <Polyline
            coordinates={[origin, target]}
            strokeWidth={3}
            strokeColor={theme.content.accent}
            lineCap="round"
          />
        </>
      ) : null}
    </MapView>
  );
}

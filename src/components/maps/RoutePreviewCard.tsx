import { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Map, Navigation, Clock } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { AppText } from '../ui/Typography';
import { radius, space, theme } from '../../theme';
import { decodePolyline } from '../../lib/googlePlaces';
import { isExpoGo } from '../../lib/expoEnvironment';

interface Props {
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  distanceMiles: number | null;
  durationMinutes: number | null;
  polyline?: string;
}

interface MapProps {
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  points: { latitude: number; longitude: number }[];
}

// Only ever rendered when NOT in Expo Go (see the branch in
// RoutePreviewCard below) — `react-native-maps` is required lazily here,
// inside this component's own render, so its native binding is never
// touched in Expo Go. Same reasoning/pattern as StripeAppProvider.tsx.
function NativeRouteMap({ pickup, dropoff, points }: MapProps) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy load, see comment above.
  const { default: MapView, Marker, Polyline } = require('react-native-maps') as typeof import('react-native-maps');

  const midLat = (pickup.lat + dropoff.lat) / 2;
  const midLng = (pickup.lng + dropoff.lng) / 2;
  const latDelta = Math.max(Math.abs(pickup.lat - dropoff.lat) * 1.6, 0.02);
  const lngDelta = Math.max(Math.abs(pickup.lng - dropoff.lng) * 1.6, 0.02);

  return (
    <MapView
      style={styles.map}
      pointerEvents="none"
      initialRegion={{ latitude: midLat, longitude: midLng, latitudeDelta: latDelta, longitudeDelta: lngDelta }}
    >
      <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} pinColor={theme.content.accent} title="Pickup" />
      <Marker coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }} pinColor={theme.content.accentSoft} title="Drop-off" />
      {points.length > 1 ? <Polyline coordinates={points} strokeColor={theme.content.accent} strokeWidth={3} /> : null}
    </MapView>
  );
}

/** Renders the pickup→drop-off route: a small non-interactive map with both pins and the driving path, plus distance/ETA. */
export function RoutePreviewCard({ pickup, dropoff, distanceMiles, durationMinutes, polyline }: Props) {
  const points = useMemo(() => (polyline ? decodePolyline(polyline) : []), [polyline]);

  return (
    <Card style={{ padding: 0, overflow: 'hidden', marginBottom: space.md }}>
      {isExpoGo || Platform.OS === 'web' ? (
        <View style={styles.expoGoPreview}>
          <Map size={22} color={theme.content.accent} strokeWidth={1.5} />
          <AppText variant="caption" center style={{ marginTop: space.xs }}>
            {Platform.OS === 'web' ? 'Route map preview — full map available in the iOS/Android app' : "Route map preview isn't available in Expo Go"}
          </AppText>
        </View>
      ) : (
        <NativeRouteMap pickup={pickup} dropoff={dropoff} points={points} />
      )}
      <View style={styles.footer}>
        <View style={styles.metaItem}>
          <Navigation size={16} color={theme.content.accent} strokeWidth={1.5} />
          <AppText variant="body" style={{ marginStart: 6 }}>
            {distanceMiles != null ? `${distanceMiles} mi` : '—'}
          </AppText>
        </View>
        <View style={styles.metaItem}>
          <Clock size={16} color={theme.content.accent} strokeWidth={1.5} />
          <AppText variant="body" style={{ marginStart: 6 }}>
            {durationMinutes != null ? `${durationMinutes} min` : '—'}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: 160 },
  expoGoPreview: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.background.secondary,
    paddingHorizontal: space.lg,
  },
  footer: {
    flexDirection: 'row',
    gap: space.lg,
    padding: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border.hairline,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.sm },
});

import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { AppText } from '../ui/Typography';
import { colors, radius, spacing } from '../../theme/tokens';
import { decodePolyline } from '../../lib/googlePlaces';

interface Props {
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  distanceMiles: number | null;
  durationMinutes: number | null;
  polyline?: string;
}

/** Renders the pickup→drop-off route: a small non-interactive map with both pins and the driving path, plus distance/ETA. */
export function RoutePreviewCard({ pickup, dropoff, distanceMiles, durationMinutes, polyline }: Props) {
  const points = useMemo(() => (polyline ? decodePolyline(polyline) : []), [polyline]);

  const midLat = (pickup.lat + dropoff.lat) / 2;
  const midLng = (pickup.lng + dropoff.lng) / 2;
  const latDelta = Math.max(Math.abs(pickup.lat - dropoff.lat) * 1.6, 0.02);
  const lngDelta = Math.max(Math.abs(pickup.lng - dropoff.lng) * 1.6, 0.02);

  return (
    <Card style={{ padding: 0, overflow: 'hidden', marginBottom: spacing.md }}>
      <MapView
        style={styles.map}
        pointerEvents="none"
        initialRegion={{ latitude: midLat, longitude: midLng, latitudeDelta: latDelta, longitudeDelta: lngDelta }}
      >
        <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} pinColor={colors.gold} title="Pickup" />
        <Marker coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }} pinColor={colors.champagne} title="Drop-off" />
        {points.length > 1 ? <Polyline coordinates={points} strokeColor={colors.gold} strokeWidth={3} /> : null}
      </MapView>
      <View style={styles.footer}>
        <View style={styles.metaItem}>
          <Ionicons name="navigate-outline" size={16} color={colors.gold} />
          <AppText variant="body" style={{ marginLeft: 6 }}>
            {distanceMiles != null ? `${distanceMiles} mi` : '—'}
          </AppText>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={16} color={colors.gold} />
          <AppText variant="body" style={{ marginLeft: 6 }}>
            {durationMinutes != null ? `${durationMinutes} min` : '—'}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: 160 },
  footer: {
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.sm },
});

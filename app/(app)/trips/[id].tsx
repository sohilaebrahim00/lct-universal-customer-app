import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { StatusPill } from '../../../src/components/ui/StatusPill';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, radius, spacing } from '../../../src/theme/tokens';
import { bookingsApi } from '../../../src/api/bookings';
import { tripsApi } from '../../../src/api/trips';
import type { Booking, Trip, TripDriverInfo, TripVehicleInfo } from '../../../src/types/api';
import { formatCurrency, formatDateTime, formatServiceType } from '../../../src/lib/format';
import { TRIP_STAGE_ORDER, TRIP_STATUS_LABELS, isTerminalStatus, stageIndex, type TripStatus } from '../../../src/lib/tripStatus';
import { useTripSocket } from '../../../src/lib/useTripSocket';
import { isMapsConfigured } from '../../../src/lib/env';
import { isExpoGo } from '../../../src/lib/expoEnvironment';

// Only ever rendered when Maps is configured AND we're not in Expo Go —
// `react-native-maps` is required lazily here, inside this component's own
// render, so its native binding is never touched in Expo Go. Same
// reasoning/pattern as StripeAppProvider.tsx.
function NativeDriverMap({ lat, lng }: { lat: number; lng: number }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy load, see comment above.
  const { default: MapView, Marker } = require('react-native-maps') as typeof import('react-native-maps');
  return (
    <MapView style={styles.map} region={{ latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}>
      <Marker coordinate={{ latitude: lat, longitude: lng }} title="Your chauffeur" pinColor={colors.gold} />
    </MapView>
  );
}

function StageTimeline({ status }: { status: TripStatus }) {
  const currentIndex = stageIndex(status);

  if (status === 'cancelled') {
    return (
      <Card>
        <StatusPill status="cancelled" />
        <AppText variant="bodyMuted" style={{ marginTop: spacing.sm }}>
          This trip was cancelled.
        </AppText>
      </Card>
    );
  }

  return (
    <Card>
      {TRIP_STAGE_ORDER.map((stage, i) => {
        const done = i < currentIndex || (i === currentIndex && status === 'completed');
        const active = i === currentIndex && status !== 'completed';
        return (
          <View key={stage} style={styles.stageRow}>
            <View style={[styles.dot, done || active ? styles.dotActive : null]} />
            <AppText
              variant={active ? 'subheading' : 'body'}
              color={done || active ? colors.offWhite : colors.mutedForeground}
              style={{ flex: 1 }}
            >
              {TRIP_STATUS_LABELS[stage]}
            </AppText>
          </View>
        );
      })}
    </Card>
  );
}

function DriverCard({ driver, vehicle, etaMinutes }: { driver: TripDriverInfo; vehicle: TripVehicleInfo | null; etaMinutes: number | null }) {
  return (
    <Card style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {driver.avatar_url ? (
          <Image source={{ uri: driver.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <AppText variant="heading" color={colors.gold}>
              {driver.full_name.charAt(0)}
            </AppText>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <AppText variant="subheading">{driver.full_name}</AppText>
          {vehicle ? <AppText variant="caption">{vehicle.name}</AppText> : null}
          {driver.rating ? <AppText variant="caption">★ {Number(driver.rating).toFixed(1)}</AppText> : null}
        </View>
        {etaMinutes != null ? (
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="caption">ETA</AppText>
            <AppText variant="subheading" color={colors.gold}>
              {etaMinutes} min
            </AppText>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

export default function TripDetailScreen() {
  const { id: bookingId } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [driver, setDriver] = useState<TripDriverInfo | null>(null);
  const [vehicle, setVehicle] = useState<TripVehicleInfo | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const live = useTripSocket(bookingId ?? null);

  const load = useCallback(() => {
    if (!bookingId) return;
    bookingsApi.get(bookingId).then(setBooking).catch(() => {});
    tripsApi
      .getByBookingId(bookingId)
      .then((res) => {
        setTrip(res.trip);
        setDriver(res.driver);
        setVehicle(res.vehicle);
      })
      .catch(() => {});
  }, [bookingId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Re-fetch driver/trip info once the socket reports driver_assigned so
  // the driver card appears without waiting for the next screen focus.
  useEffect(() => {
    if (live.status === 'driver_assigned' && !driver) load();
  }, [live.status, driver, load]);

  async function handleCancel() {
    if (!booking) return;
    setCancelling(true);
    try {
      const updated = await bookingsApi.cancel(booking.id);
      setBooking(updated);
    } finally {
      setCancelling(false);
    }
  }

  if (!booking) return <ScreenContainer><AppText variant="body">Loading…</AppText></ScreenContainer>;

  const status = live.status ?? trip?.status ?? booking.status;
  const driverLat = live.location?.lat ?? trip?.driver_current_lat ?? null;
  const driverLng = live.location?.lng ?? trip?.driver_current_lng ?? null;
  const etaMinutes = live.location?.etaMinutes ?? trip?.eta_minutes ?? null;
  const canCancel = !isTerminalStatus(status) && status !== 'passenger_picked_up' && status !== 'trip_started';

  return (
    <ScreenContainer>
      <AppText variant="eyebrow">{formatServiceType(booking.service_type)}</AppText>
      <AppText variant="title" style={{ marginBottom: spacing.xs }}>
        {formatDateTime(booking.scheduled_at)}
      </AppText>
      <View style={{ marginBottom: spacing.md }}>
        <StatusPill status={status} />
      </View>

      {driver && !isTerminalStatus(status) ? <DriverCard driver={driver} vehicle={vehicle} etaMinutes={etaMinutes} /> : null}

      {driverLat != null && driverLng != null ? (
        <Card style={{ marginBottom: spacing.md, padding: 0, overflow: 'hidden' }}>
          {isMapsConfigured && !isExpoGo && Platform.OS !== 'web' ? (
            <NativeDriverMap lat={driverLat} lng={driverLng} />
          ) : (
            <View style={styles.mapPlaceholder}>
              <AppText variant="caption" center>
                {Platform.OS === 'web'
                  ? 'Live map preview — full tracking map available in the iOS/Android app'
                  : 'Live map unavailable on this build'}
              </AppText>
            </View>
          )}
        </Card>
      ) : null}

      <StageTimeline status={status} />

      <Card style={{ marginTop: spacing.md }}>
        <AppText variant="caption">Pickup</AppText>
        <AppText variant="body" style={{ marginBottom: spacing.sm }}>
          {booking.pickup_address}
        </AppText>
        {booking.dropoff_address ? (
          <>
            <AppText variant="caption">Drop-off</AppText>
            <AppText variant="body" style={{ marginBottom: spacing.sm }}>
              {booking.dropoff_address}
            </AppText>
          </>
        ) : null}
        <AppText variant="caption">Total Fare</AppText>
        <AppText variant="subheading" color={colors.gold}>
          {formatCurrency(booking.total_fare, booking.currency)}
        </AppText>
      </Card>

      {canCancel ? (
        <Button label="Cancel Trip" variant="danger" onPress={handleCancel} loading={cancelling} style={{ marginTop: spacing.lg }} />
      ) : null}

      {!live.connected ? (
        <AppText variant="caption" center style={{ marginTop: spacing.md }}>
          Live updates reconnecting… pull to refresh for the latest status.
        </AppText>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: radius.full, backgroundColor: colors.charcoal },
  dotActive: { backgroundColor: colors.gold },
  avatar: { width: 56, height: 56, borderRadius: radius.full },
  avatarPlaceholder: { backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  map: { width: '100%', height: 200 },
  mapPlaceholder: { width: '100%', height: 200, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
});

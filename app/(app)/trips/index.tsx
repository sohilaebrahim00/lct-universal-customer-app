import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, RefreshControl, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Card } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { StatusPill } from '../../../src/components/ui/StatusPill';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, spacing } from '../../../src/theme/tokens';
import { bookingsApi } from '../../../src/api/bookings';
import type { Booking } from '../../../src/types/api';
import { formatCurrency, formatDateTime, formatServiceType } from '../../../src/lib/format';
import { isUpcomingBookingStatus } from '../../../src/lib/tripStatus';
import { AuthGate } from '../../../src/components/AuthGate';
import { useAuthStore } from '../../../src/store/authStore';

function TripCard({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ marginBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
          <AppText variant="subheading">{formatServiceType(booking.service_type)}</AppText>
          <AppText variant="subheading" color={colors.gold}>
            {formatCurrency(booking.total_fare, booking.currency)}
          </AppText>
        </View>
        <AppText variant="caption" style={{ marginBottom: spacing.sm }}>
          {formatDateTime(booking.scheduled_at)}
        </AppText>
        <StatusPill status={booking.status} />
      </Card>
    </Pressable>
  );
}

export default function TripsScreen() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    if (status !== 'signed-in') return;
    bookingsApi
      .list()
      .then(setBookings)
      .catch(() => setBookings([]));
  }, [status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await bookingsApi.list().then(setBookings).catch(() => {});
    setRefreshing(false);
  }

  const upcoming = bookings?.filter((b) => isUpcomingBookingStatus(b.status)) ?? [];
  const past = bookings?.filter((b) => !isUpcomingBookingStatus(b.status)) ?? [];

  return (
    <ScreenContainer scroll={false}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        <AppText variant="display" style={{ marginBottom: spacing.lg }}>
          Your Trips
        </AppText>

        <AuthGate
          title="Sign in to view your trip history"
          message="Upcoming and past trips, live tracking, and receipts all live here once you have an account."
        >
          <AppText variant="heading" style={{ marginBottom: spacing.sm }}>
            Upcoming
          </AppText>
          {upcoming.length === 0 ? (
            <AppText variant="bodyMuted" style={{ marginBottom: spacing.lg }}>
              No upcoming trips yet.
            </AppText>
          ) : (
            upcoming.map((booking) => (
              <TripCard key={booking.id} booking={booking} onPress={() => router.push(`/(app)/trips/${booking.id}`)} />
            ))
          )}

          <AppText variant="heading" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
            Past
          </AppText>
          {past.length === 0 ? (
            <AppText variant="bodyMuted">No past trips.</AppText>
          ) : (
            past.map((booking) => (
              <TripCard key={booking.id} booking={booking} onPress={() => router.push(`/(app)/trips/${booking.id}`)} />
            ))
          )}
        </AuthGate>

        {status !== 'signed-in' ? (
          <Button
            label="Preview Live Tracking"
            variant="ghost"
            onPress={() => router.push('/(app)/demo-trip')}
            style={{ marginTop: spacing.lg }}
          />
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

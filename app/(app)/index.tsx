import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Divider } from '../../src/components/ui/Divider';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { AppText } from '../../src/components/ui/Typography';
import { StatusPill } from '../../src/components/ui/StatusPill';
import { FadeSlideIn } from '../../src/components/ui/FadeSlideIn';
import { colors, radius, spacing } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/store/authStore';
import { useBookingFormStore } from '../../src/store/bookingFormStore';
import { bookingsApi } from '../../src/api/bookings';
import type { Booking, ServiceType } from '../../src/types/api';
import { formatDateShort, formatDateTime, formatServiceType } from '../../src/lib/format';
import { SERVICES } from '../../src/lib/services';

const HOME_SERVICE_TYPES: ServiceType[] = ['airport', 'corporate', 'events', 'hourly'];
const HOME_SERVICES = HOME_SERVICE_TYPES.map((type) => SERVICES.find((s) => s.type === type)).filter(
  (s): s is (typeof SERVICES)[number] => Boolean(s),
);

function QuickBookingRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickRow}>
      <Ionicons name={icon} size={18} color={colors.gold} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <AppText variant="caption">{label}</AppText>
        <AppText variant="body">{value}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const draft = useBookingFormStore((s) => s.draft);
  const resetDraft = useBookingFormStore((s) => s.reset);
  const updateDraft = useBookingFormStore((s) => s.update);
  const [nextTrip, setNextTrip] = useState<Booking | null>(null);

  useEffect(() => {
    if (status !== 'signed-in') return;
    bookingsApi
      .list({ upcoming: true })
      .then((bookings) => setNextTrip(bookings[0] ?? null))
      .catch(() => setNextTrip(null));
  }, [status]);

  function startBooking(serviceType: ServiceType) {
    resetDraft();
    updateDraft({ serviceType });
    router.push('/(app)/book');
  }

  function startQuickBooking() {
    if (!draft.serviceType) updateDraft({ serviceType: 'point_to_point' });
    router.push('/(app)/book/pickup');
  }

  const firstName = profile?.full_name?.split(' ')[0];

  return (
    <ScreenContainer padded={false}>
      <View style={styles.hero}>
        <Image source={require('../../assets/home/hero.jpg')} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, styles.heroOverlay]} />
        <View style={styles.heroContent}>
          <AppText variant="eyebrow" style={{ marginBottom: spacing.xs }}>
            {status === 'signed-in' && firstName ? `Welcome back, ${firstName}` : 'LCT Universal'}
          </AppText>
          <AppText variant="display" style={{ marginBottom: spacing.md }}>
            Executive Transportation, On Demand
          </AppText>
          <Button label="Book Your Ride" onPress={() => startBooking('point_to_point')} style={{ alignSelf: 'flex-start' }} />
        </View>
      </View>

      <View style={{ padding: spacing.lg }}>
        {status !== 'signed-in' ? (
          <FadeSlideIn>
            <View style={styles.guestBanner}>
              <Ionicons name="person-circle-outline" size={18} color={colors.gold} />
              <AppText variant="caption" style={{ marginLeft: spacing.sm, flex: 1 }}>
                You&apos;re browsing as a guest — sign in when you&apos;re ready to book.
              </AppText>
            </View>
          </FadeSlideIn>
        ) : null}

        {nextTrip ? (
          <FadeSlideIn delay={40}>
            <Pressable onPress={() => router.push(`/(app)/trips/${nextTrip.id}`)}>
              <Card style={{ marginBottom: spacing.lg }}>
                <AppText variant="caption">Your next trip</AppText>
                <AppText variant="subheading" style={{ marginVertical: spacing.xs }}>
                  {formatServiceType(nextTrip.service_type)} · {formatDateTime(nextTrip.scheduled_at)}
                </AppText>
                <StatusPill status={nextTrip.status} />
              </Card>
            </Pressable>
          </FadeSlideIn>
        ) : null}

        <FadeSlideIn delay={80}>
          <AppText variant="heading" style={{ marginBottom: spacing.sm }}>
            Quick Booking
          </AppText>
          <Card style={{ marginBottom: spacing.lg, padding: 0 }}>
            <QuickBookingRow
              icon="ellipse-outline"
              label="Pickup"
              value={draft.pickupAddress || 'Set pickup location'}
              onPress={startQuickBooking}
            />
            <Divider />
            <QuickBookingRow
              icon="location-outline"
              label="Drop-off"
              value={draft.dropoffAddress || 'Set destination'}
              onPress={startQuickBooking}
            />
            <Divider />
            <QuickBookingRow
              icon="calendar-outline"
              label="Date"
              value={draft.scheduledAt ? formatDateShort(draft.scheduledAt.toISOString()) : 'Choose date & time'}
              onPress={startQuickBooking}
            />
            <Divider />
            <QuickBookingRow
              icon="car-sport-outline"
              label="Vehicle Type"
              value={draft.vehicle?.name ?? 'Browse the fleet'}
              onPress={() => router.push('/(app)/fleet')}
            />
          </Card>
        </FadeSlideIn>

        <FadeSlideIn delay={140}>
          <AppText variant="heading" style={{ marginBottom: spacing.md }}>
            Services
          </AppText>
          <View style={styles.grid}>
            {HOME_SERVICES.map((service) => (
              <Pressable key={service.type} style={styles.tile} onPress={() => startBooking(service.type)}>
                <View style={styles.iconWrap}>
                  <Ionicons name={service.icon} size={26} color={colors.gold} />
                </View>
                <AppText variant="subheading" center>
                  {service.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </FadeSlideIn>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 340, justifyContent: 'flex-end' },
  heroOverlay: { backgroundColor: 'rgba(2,2,1,0.55)' },
  heroContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.onyx,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  quickRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    width: '47%',
    aspectRatio: 1.15,
    backgroundColor: colors.onyx,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: 'rgba(217,177,96,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

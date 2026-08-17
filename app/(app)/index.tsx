import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components/ui/Card';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { AppText } from '../../src/components/ui/Typography';
import { StatusPill } from '../../src/components/ui/StatusPill';
import { colors, radius, spacing } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/store/authStore';
import { useBookingFormStore } from '../../src/store/bookingFormStore';
import { bookingsApi } from '../../src/api/bookings';
import type { Booking, ServiceType } from '../../src/types/api';
import { formatDateTime, formatServiceType } from '../../src/lib/format';
import { SERVICES } from '../../src/lib/services';
import { FadeSlideIn } from '../../src/components/ui/FadeSlideIn';

export default function HomeScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const resetDraft = useBookingFormStore((s) => s.reset);
  const updateDraft = useBookingFormStore((s) => s.update);
  const [nextTrip, setNextTrip] = useState<Booking | null>(null);

  useEffect(() => {
    bookingsApi
      .list({ upcoming: true })
      .then((bookings) => setNextTrip(bookings[0] ?? null))
      .catch(() => setNextTrip(null));
  }, []);

  function startBooking(serviceType: ServiceType) {
    resetDraft();
    updateDraft({ serviceType });
    router.push('/(app)/book');
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <ScreenContainer>
      <AppText variant="eyebrow">LCT Universal</AppText>
      <AppText variant="display" style={{ marginBottom: spacing.lg }}>
        Hi, {firstName}
      </AppText>

      {nextTrip ? (
        <Pressable onPress={() => router.push(`/(app)/trips/${nextTrip.id}`)}>
          <Card style={{ marginBottom: spacing.lg }}>
            <AppText variant="caption">Your next trip</AppText>
            <AppText variant="subheading" style={{ marginVertical: spacing.xs }}>
              {formatServiceType(nextTrip.service_type)} · {formatDateTime(nextTrip.scheduled_at)}
            </AppText>
            <StatusPill status={nextTrip.status} />
          </Card>
        </Pressable>
      ) : null}

      <AppText variant="heading" style={{ marginBottom: spacing.md }}>
        Where to?
      </AppText>
      <View style={styles.grid}>
        {SERVICES.map((service, i) => (
          <FadeSlideIn key={service.type} delay={i * 60} style={styles.tileWrap}>
            <Pressable style={styles.tile} onPress={() => startBooking(service.type)}>
              <View style={styles.iconWrap}>
                <Ionicons name={service.icon} size={26} color={colors.gold} />
              </View>
              <AppText variant="subheading" center>
                {service.label}
              </AppText>
            </Pressable>
          </FadeSlideIn>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tileWrap: { width: '47%' },
  tile: {
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

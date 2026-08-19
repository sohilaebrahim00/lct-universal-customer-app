import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Calendar, Car, ChevronRight, Circle, MapPin, UserCircle, type LucideIcon } from 'lucide-react-native';
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
import { vehiclesApi } from '../../src/api/vehicles';
import type { Booking, ServiceType, Vehicle } from '../../src/types/api';
import { formatCurrency, formatDateShort, formatDateTime, formatServiceType } from '../../src/lib/format';
import { SERVICES } from '../../src/lib/services';
import { SERVICE_ICON_COMPONENTS } from '../../src/lib/serviceIcons';
import { VEHICLE_DISPLAY_NAME, VEHICLE_IMAGES } from '../../src/lib/vehicleImages';
import { PricingPreview } from '../../src/components/PricingPreview';
import { WhyChooseLct } from '../../src/components/WhyChooseLct';
import { ReviewsSection } from '../../src/components/ReviewsSection';

const HOME_SERVICE_TYPES: ServiceType[] = ['airport', 'corporate', 'events', 'hourly'];
const HOME_SERVICES = HOME_SERVICE_TYPES.map((type) => SERVICES.find((s) => s.type === type)).filter(
  (s): s is (typeof SERVICES)[number] => Boolean(s),
);
const FEATURED_FLEET_TYPES: Vehicle['type'][] = ['executive_sedan', 'suv', 'sprinter'];

function QuickBookingRow({
  icon: Icon,
  label,
  value,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickRow}>
      <Icon size={18} color={colors.gold} strokeWidth={1.5} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <AppText variant="caption">{label}</AppText>
        <AppText variant="body">{value}</AppText>
      </View>
      <ChevronRight size={16} color={colors.mutedForeground} strokeWidth={1.5} />
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
  const [fleetRates, setFleetRates] = useState<Record<string, Vehicle>>({});

  useEffect(() => {
    if (status !== 'signed-in') return;
    bookingsApi
      .list({ upcoming: true })
      .then((bookings) => setNextTrip(bookings[0] ?? null))
      .catch(() => setNextTrip(null));
  }, [status]);

  useEffect(() => {
    vehiclesApi
      .list()
      .then((vehicles) => setFleetRates(Object.fromEntries(vehicles.map((v) => [v.type, v]))))
      .catch(() => setFleetRates({}));
  }, []);

  function startBooking(serviceType: ServiceType) {
    resetDraft();
    updateDraft({ serviceType });
    router.push('/(app)/book');
  }

  function handleServicePress(serviceType: ServiceType) {
    if (serviceType === 'airport') {
      router.push('/(app)/airport');
      return;
    }
    startBooking(serviceType);
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
            Executive Transportation, Redefined
          </AppText>
          <View style={styles.heroActions}>
            <Button label="Book a Ride" onPress={() => startBooking('point_to_point')} style={{ flex: 1 }} />
            <Button label="Explore Fleet" variant="secondary" onPress={() => router.push('/(app)/fleet')} style={{ flex: 1 }} />
          </View>
        </View>
      </View>

      <View style={{ padding: spacing.lg }}>
        {status !== 'signed-in' ? (
          <FadeSlideIn>
            <View style={styles.guestBanner}>
              <UserCircle size={18} color={colors.gold} strokeWidth={1.5} />
              <AppText variant="caption" style={{ marginLeft: spacing.sm, flex: 1 }}>
                You&apos;re browsing as a guest — sign in when you&apos;re ready to book.
              </AppText>
            </View>
          </FadeSlideIn>
        ) : null}

        {nextTrip ? (
          <FadeSlideIn delay={40}>
            <AppText variant="heading" style={{ marginBottom: spacing.sm }}>
              Upcoming Trip
            </AppText>
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
              icon={Circle}
              label="Pickup"
              value={draft.pickupAddress || 'Set pickup location'}
              onPress={startQuickBooking}
            />
            <Divider />
            <QuickBookingRow
              icon={MapPin}
              label="Drop-off"
              value={draft.dropoffAddress || 'Set destination'}
              onPress={startQuickBooking}
            />
            <Divider />
            <QuickBookingRow
              icon={Calendar}
              label="Date"
              value={draft.scheduledAt ? formatDateShort(draft.scheduledAt.toISOString()) : 'Choose date & time'}
              onPress={startQuickBooking}
            />
            <Divider />
            <QuickBookingRow
              icon={Car}
              label="Vehicle Type"
              value={draft.vehicle?.name ?? 'Browse the fleet'}
              onPress={() => router.push('/(app)/fleet')}
            />
          </Card>
        </FadeSlideIn>

        <FadeSlideIn delay={140}>
          <AppText variant="heading" style={{ marginBottom: spacing.md }}>
            Quick Services
          </AppText>
          <View style={styles.grid}>
            {HOME_SERVICES.map((service) => {
              const Icon = SERVICE_ICON_COMPONENTS[service.icon];
              return (
                <Pressable key={service.type} style={styles.tile} onPress={() => handleServicePress(service.type)}>
                  <View style={styles.iconWrap}>
                    <Icon size={24} color={colors.gold} strokeWidth={1.5} />
                  </View>
                  <AppText variant="subheading" center>
                    {service.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </FadeSlideIn>
      </View>

      <FadeSlideIn delay={180}>
        <View style={{ paddingLeft: spacing.lg, marginBottom: spacing.xl }}>
          <AppText variant="heading" style={{ marginBottom: spacing.md }}>
            Featured Fleet
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}>
            {FEATURED_FLEET_TYPES.map((type) => {
              const rate = fleetRates[type];
              return (
                <Pressable key={type} style={styles.fleetCard} onPress={() => router.push('/(app)/fleet')}>
                  <Image source={VEHICLE_IMAGES[type]} style={styles.fleetImage} resizeMode="cover" />
                  <View style={styles.fleetBody}>
                    <AppText variant="subheading">{VEHICLE_DISPLAY_NAME[type]}</AppText>
                    {rate ? (
                      <AppText variant="caption" color={colors.gold} style={{ marginTop: 2 }}>
                        From {formatCurrency(rate.base_rate)}
                      </AppText>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </FadeSlideIn>

      <View style={{ padding: spacing.lg, paddingTop: 0 }}>
        <FadeSlideIn delay={220}>
          <AppText variant="heading" style={{ marginBottom: spacing.md }}>
            Why LCT Universal?
          </AppText>
          <WhyChooseLct />
        </FadeSlideIn>

        <FadeSlideIn delay={260}>
          <AppText variant="heading" style={{ marginBottom: spacing.md }}>
            Pricing Preview
          </AppText>
          <PricingPreview />
        </FadeSlideIn>

        <FadeSlideIn delay={300}>
          <AppText variant="heading" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
            What Our Clients Say
          </AppText>
        </FadeSlideIn>
      </View>

      <FadeSlideIn delay={320}>
        <View style={{ paddingLeft: spacing.lg, marginBottom: spacing.xl }}>
          <ReviewsSection />
        </View>
      </FadeSlideIn>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 380, justifyContent: 'flex-end' },
  heroOverlay: { backgroundColor: 'rgba(2,2,1,0.55)' },
  heroContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  heroActions: { flexDirection: 'row', gap: spacing.sm },
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
  fleetCard: {
    width: 200,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.onyx,
  },
  fleetImage: { width: '100%', height: 120 },
  fleetBody: { padding: spacing.md },
});

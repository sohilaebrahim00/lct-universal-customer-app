import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { CheckCircle2, Users, Briefcase } from 'lucide-react-native';
import { StepHeader } from '../../../src/components/booking/StepHeader';
import { Button } from '../../../src/components/ui/Button';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, radius, shadows, spacing } from '../../../src/theme/tokens';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { vehiclesApi } from '../../../src/api/vehicles';
import type { Vehicle } from '../../../src/types/api';
import { calculateFarePreview } from '../../../src/lib/pricingPreview';
import { formatCurrency } from '../../../src/lib/format';
import { VEHICLE_DISPLAY_NAME, VEHICLE_IMAGES } from '../../../src/lib/vehicleImages';
import { RoutePreviewCard } from '../../../src/components/maps/RoutePreviewCard';
import { isMapsConfigured } from '../../../src/lib/env';
import { FadeSlideIn } from '../../../src/components/ui/FadeSlideIn';

export default function VehicleStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const update = useBookingFormStore((s) => s.update);
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    vehiclesApi
      .list()
      .then(setVehicles)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load vehicles'));
  }, []);

  // Date/time isn't collected until the next step, so this preview uses
  // "now" as a placeholder purely to evaluate the late-night surcharge —
  // the only part of the fare that can still shift once the real
  // scheduledAt is known. Distance is already real (computed from the
  // pickup/destination route). The Payment step recomputes the exact,
  // authoritative total once the date/time is set.
  const previewDate = useMemo(() => new Date(), []);

  const estimates = useMemo(() => {
    if (!vehicles || !draft.serviceType) return null;
    const map = new Map<string, number | null>();
    for (const vehicle of vehicles) {
      if (draft.serviceType === 'hourly') continue;
      try {
        const fare = calculateFarePreview({
          vehicle: {
            baseRate: Number(vehicle.base_rate),
            perMileRate: Number(vehicle.per_mile_rate),
            perHourRate: vehicle.per_hour_rate === null ? null : Number(vehicle.per_hour_rate),
          },
          serviceType: draft.serviceType,
          distanceMiles: draft.distanceMiles,
          scheduledAt: previewDate,
        });
        map.set(vehicle.id, fare.totalFare);
      } catch {
        map.set(vehicle.id, null);
      }
    }
    return map;
  }, [vehicles, draft.serviceType, draft.distanceMiles, previewDate]);

  return (
    <ScreenContainer>
      <StepHeader step={3} title="Choose Your Vehicle" subtitle="Every class includes a professional chauffeur." />

      {isMapsConfigured && draft.serviceType !== 'hourly' && draft.pickupLat && draft.pickupLng && draft.dropoffLat && draft.dropoffLng ? (
        <RoutePreviewCard
          pickup={{ lat: draft.pickupLat, lng: draft.pickupLng, address: draft.pickupAddress }}
          dropoff={{ lat: draft.dropoffLat, lng: draft.dropoffLng, address: draft.dropoffAddress }}
          distanceMiles={draft.distanceMiles}
          durationMinutes={draft.durationMinutes}
          polyline={draft.routePolyline ?? undefined}
        />
      ) : null}

      {!vehicles && !error ? <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} /> : null}
      {error ? (
        <AppText variant="body" color={colors.destructive}>
          {error}
        </AppText>
      ) : null}

      <View style={{ gap: spacing.md }}>
        {vehicles?.map((vehicle, i) => {
          const selected = draft.vehicle?.id === vehicle.id;
          const estimate = estimates?.get(vehicle.id) ?? null;
          const fitsPassengers = vehicle.capacity_passengers >= draft.passengerCount;
          const image = VEHICLE_IMAGES[vehicle.type];
          const displayName = VEHICLE_DISPLAY_NAME[vehicle.type] ?? vehicle.name;

          return (
            <FadeSlideIn key={vehicle.id} delay={i * 80}>
            <Pressable
              onPress={() => update({ vehicle })}
              style={[styles.card, selected ? styles.cardSelected : null]}
            >
              {image ? <Image source={image} style={styles.image} resizeMode="cover" /> : null}
              <View style={styles.body}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="subheading">{displayName}</AppText>
                    <AppText variant="caption" style={{ marginTop: 2 }}>
                      {vehicle.description}
                    </AppText>
                  </View>
                  {selected ? <CheckCircle2 size={22} color={colors.gold} strokeWidth={1.5} /> : null}
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Users size={14} color={colors.mutedForeground} strokeWidth={1.5} />
                    <AppText variant="caption"> {vehicle.capacity_passengers} passengers</AppText>
                  </View>
                  <View style={styles.metaItem}>
                    <Briefcase size={14} color={colors.mutedForeground} strokeWidth={1.5} />
                    <AppText variant="caption"> {vehicle.capacity_luggage} bags</AppText>
                  </View>
                </View>

                {!fitsPassengers ? (
                  <AppText variant="caption" color={colors.destructive} style={{ marginTop: 4 }}>
                    Doesn&apos;t fit your party size
                  </AppText>
                ) : null}

                <View style={styles.priceRow}>
                  {draft.serviceType === 'hourly' ? (
                    <AppText variant="subheading" color={colors.gold}>
                      {vehicle.per_hour_rate ? `${formatCurrency(vehicle.per_hour_rate)} / hour` : 'Contact for pricing'}
                    </AppText>
                  ) : (
                    <AppText variant="subheading" color={colors.gold}>
                      {estimate != null ? `Est. ${formatCurrency(estimate)}` : '—'}
                    </AppText>
                  )}
                </View>
              </View>
            </Pressable>
            </FadeSlideIn>
          );
        })}
      </View>

      <Button
        label="Continue"
        onPress={() => router.push('/(app)/book/details')}
        disabled={!draft.vehicle}
        style={{ marginTop: spacing.xl }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.onyx,
    overflow: 'hidden',
  },
  cardSelected: { borderColor: colors.gold, ...shadows.gold },
  image: { width: '100%', height: 180 },
  body: { padding: spacing.md },
  metaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  priceRow: { marginTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm },
});

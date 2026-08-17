import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StepHeader } from '../../../src/components/booking/StepHeader';
import { Button } from '../../../src/components/ui/Button';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, radius, spacing } from '../../../src/theme/tokens';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { vehiclesApi } from '../../../src/api/vehicles';
import type { Vehicle } from '../../../src/types/api';
import { calculateFarePreview } from '../../../src/lib/pricingPreview';
import { formatCurrency } from '../../../src/lib/format';

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

  const estimates = useMemo(() => {
    if (!vehicles || !draft.serviceType || !draft.scheduledAt) return null;
    const map = new Map<string, number | null>();
    for (const vehicle of vehicles) {
      try {
        const fare = calculateFarePreview({
          vehicle: {
            baseRate: Number(vehicle.base_rate),
            perMileRate: Number(vehicle.per_mile_rate),
            perHourRate: vehicle.per_hour_rate === null ? null : Number(vehicle.per_hour_rate),
          },
          serviceType: draft.serviceType,
          distanceMiles: draft.distanceMiles,
          hourlyDurationHours: draft.hourlyDurationHours,
          scheduledAt: draft.scheduledAt,
        });
        map.set(vehicle.id, fare.totalFare);
      } catch {
        map.set(vehicle.id, null);
      }
    }
    return map;
  }, [vehicles, draft.serviceType, draft.scheduledAt, draft.distanceMiles, draft.hourlyDurationHours]);

  return (
    <ScreenContainer>
      <StepHeader step={5} title="Choose Your Vehicle" subtitle="Estimated total, all-inclusive." />

      {!vehicles && !error ? <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} /> : null}
      {error ? (
        <AppText variant="body" color={colors.destructive}>
          {error}
        </AppText>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        {vehicles?.map((vehicle) => {
          const selected = draft.vehicle?.id === vehicle.id;
          const estimate = estimates?.get(vehicle.id) ?? null;
          const fitsPassengers = vehicle.capacity_passengers >= draft.passengerCount;

          return (
            <Pressable
              key={vehicle.id}
              onPress={() => update({ vehicle })}
              style={[styles.card, selected ? styles.cardSelected : null]}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="subheading">{vehicle.name}</AppText>
                <AppText variant="caption" style={{ marginTop: 2 }}>
                  Up to {vehicle.capacity_passengers} passengers · {vehicle.capacity_luggage} bags
                </AppText>
                {!fitsPassengers ? (
                  <AppText variant="caption" color={colors.destructive} style={{ marginTop: 2 }}>
                    Doesn&apos;t fit your party size
                  </AppText>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="subheading" color={colors.gold}>
                  {estimate != null ? formatCurrency(estimate) : '—'}
                </AppText>
                {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.gold} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Button
        label="Continue"
        onPress={() => router.push('/(app)/book/review')}
        disabled={!draft.vehicle}
        style={{ marginTop: spacing.xl }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.onyx,
  },
  cardSelected: { borderColor: colors.gold },
});

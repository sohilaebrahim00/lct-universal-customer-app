import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { Divider } from '../../../src/components/ui/Divider';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { FadeSlideIn } from '../../../src/components/ui/FadeSlideIn';
import { colors, spacing } from '../../../src/theme/tokens';
import { vehiclesApi } from '../../../src/api/vehicles';
import type { Vehicle } from '../../../src/types/api';
import { formatCurrency } from '../../../src/lib/format';
import { VEHICLE_DISPLAY_NAME, VEHICLE_IMAGES } from '../../../src/lib/vehicleImages';
import { VEHICLE_FEATURES, VEHICLE_TAGLINE } from '../../../src/lib/vehicleFeatures';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const resetDraft = useBookingFormStore((s) => s.reset);
  const update = useBookingFormStore((s) => s.update);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    vehiclesApi
      .get(id)
      .then(setVehicle)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load this vehicle'));
  }, [id]);

  if (error) {
    return (
      <ScreenContainer>
        <AppText variant="body" color={colors.destructive}>
          {error}
        </AppText>
      </ScreenContainer>
    );
  }

  if (!vehicle) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} />
      </ScreenContainer>
    );
  }

  const image = VEHICLE_IMAGES[vehicle.type];
  const displayName = VEHICLE_DISPLAY_NAME[vehicle.type] ?? vehicle.name;
  const tagline = VEHICLE_TAGLINE[vehicle.type];
  const features = VEHICLE_FEATURES[vehicle.type] ?? [];

  function handleBookThisVehicle() {
    if (!vehicle) return;
    resetDraft();
    update({ vehicle });
    router.push('/(app)/book');
  }

  return (
    <ScreenContainer padded={false}>
      {image ? <Image source={image} style={styles.hero} resizeMode="cover" /> : null}

      <View style={{ padding: spacing.lg }}>
        <FadeSlideIn>
          <AppText variant="eyebrow" style={{ marginBottom: spacing.xs }}>
            LCT Universal Fleet
          </AppText>
          <AppText variant="display" style={{ marginBottom: spacing.xs }}>
            {displayName}
          </AppText>
          <AppText variant="bodyMuted" style={{ marginBottom: spacing.lg }}>
            {vehicle.description ?? tagline}
          </AppText>
        </FadeSlideIn>

        <FadeSlideIn delay={80}>
          <Card style={{ marginBottom: spacing.md }}>
            <View style={styles.specRow}>
              <View style={styles.specItem}>
                <Ionicons name="people-outline" size={20} color={colors.gold} />
                <AppText variant="subheading" style={{ marginTop: spacing.xs }}>
                  {vehicle.capacity_passengers}
                </AppText>
                <AppText variant="caption">Passengers</AppText>
              </View>
              <View style={styles.specDivider} />
              <View style={styles.specItem}>
                <Ionicons name="briefcase-outline" size={20} color={colors.gold} />
                <AppText variant="subheading" style={{ marginTop: spacing.xs }}>
                  {vehicle.capacity_luggage}
                </AppText>
                <AppText variant="caption">Bags</AppText>
              </View>
              <View style={styles.specDivider} />
              <View style={styles.specItem}>
                <Ionicons name="pricetag-outline" size={20} color={colors.gold} />
                <AppText variant="subheading" style={{ marginTop: spacing.xs }}>
                  {formatCurrency(vehicle.base_rate)}
                </AppText>
                <AppText variant="caption">Base rate</AppText>
              </View>
            </View>
          </Card>
        </FadeSlideIn>

        <FadeSlideIn delay={140}>
          <AppText variant="heading" style={{ marginBottom: spacing.sm }}>
            Premium Features
          </AppText>
          <Card style={{ marginBottom: spacing.lg }}>
            {features.map((feature, i) => (
              <View key={feature}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.gold} />
                  <AppText variant="body" style={{ marginLeft: spacing.sm }}>
                    {feature}
                  </AppText>
                </View>
              </View>
            ))}
          </Card>
        </FadeSlideIn>

        <FadeSlideIn delay={200}>
          {vehicle.per_hour_rate ? (
            <AppText variant="bodyMuted" style={{ marginBottom: spacing.md }}>
              {`Hourly charter from ${formatCurrency(vehicle.per_hour_rate)} / hour`}
            </AppText>
          ) : null}

          <Button label="Book This Vehicle" onPress={handleBookThisVehicle} />
        </FadeSlideIn>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 260 },
  specRow: { flexDirection: 'row', alignItems: 'center' },
  specItem: { flex: 1, alignItems: 'center' },
  specDivider: { width: StyleSheet.hairlineWidth, height: 44, backgroundColor: colors.border },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
});

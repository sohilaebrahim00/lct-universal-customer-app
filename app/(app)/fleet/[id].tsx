import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Users, Briefcase, Tag, CheckCircle2 } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { Divider } from '../../../src/components/ui/Divider';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { FadeSlideIn } from '../../../src/components/ui/FadeSlideIn';
import { space, theme } from '../../../src/theme';
import { vehiclesApi } from '../../../src/api/vehicles';
import type { Vehicle } from '../../../src/types/api';
import { formatCurrency } from '../../../src/lib/format';
import { VEHICLE_DISPLAY_NAME, VEHICLE_IMAGES } from '../../../src/lib/vehicleImages';
import { VEHICLE_FEATURES, VEHICLE_TAGLINE } from '../../../src/lib/vehicleFeatures';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { AppImage } from '../../../src/components/ui/AppImage';

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
        <AppText variant="body" color={theme.content.danger}>
          {error}
        </AppText>
      </ScreenContainer>
    );
  }

  if (!vehicle) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={theme.content.accent} style={{ marginTop: space.xl }} />
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
      {image ? <AppImage source={image} style={styles.hero} priority="high" /> : null}

      <View style={{ padding: space.lg }}>
        <FadeSlideIn>
          <AppText variant="eyebrow" style={{ marginBottom: space.xs }}>
            LCT Universal Fleet
          </AppText>
          <AppText variant="display" style={{ marginBottom: space.xs }}>
            {displayName}
          </AppText>
          <AppText variant="bodyMuted" style={{ marginBottom: space.lg }}>
            {vehicle.description ?? tagline}
          </AppText>
        </FadeSlideIn>

        <FadeSlideIn delay={80}>
          <Card style={{ marginBottom: space.md }}>
            <View style={styles.specRow}>
              <View style={styles.specItem}>
                <Users size={20} color={theme.content.accent} strokeWidth={1.5} />
                <AppText variant="subheading" style={{ marginTop: space.xs }}>
                  {vehicle.capacity_passengers}
                </AppText>
                <AppText variant="caption">Passengers</AppText>
              </View>
              <View style={styles.specDivider} />
              <View style={styles.specItem}>
                <Briefcase size={20} color={theme.content.accent} strokeWidth={1.5} />
                <AppText variant="subheading" style={{ marginTop: space.xs }}>
                  {vehicle.capacity_luggage}
                </AppText>
                <AppText variant="caption">Bags</AppText>
              </View>
              <View style={styles.specDivider} />
              <View style={styles.specItem}>
                <Tag size={20} color={theme.content.accent} strokeWidth={1.5} />
                <AppText variant="subheading" style={{ marginTop: space.xs }}>
                  {formatCurrency(vehicle.base_rate)}
                </AppText>
                <AppText variant="caption">Base rate</AppText>
              </View>
            </View>
          </Card>
        </FadeSlideIn>

        <FadeSlideIn delay={140}>
          <AppText variant="heading" style={{ marginBottom: space.sm }}>
            Premium Features
          </AppText>
          <Card style={{ marginBottom: space.lg }}>
            {features.map((feature, i) => (
              <View key={feature}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.featureRow}>
                  <CheckCircle2 size={18} color={theme.content.accent} strokeWidth={1.5} />
                  <AppText variant="body" style={{ marginStart: space.sm }}>
                    {feature}
                  </AppText>
                </View>
              </View>
            ))}
          </Card>
        </FadeSlideIn>

        <FadeSlideIn delay={200}>
          {vehicle.per_hour_rate ? (
            <AppText variant="bodyMuted" style={{ marginBottom: space.md }}>
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
  specDivider: { width: StyleSheet.hairlineWidth, height: 44, backgroundColor: theme.border.hairline },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.xs },
});

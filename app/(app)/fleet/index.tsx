import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { FadeSlideIn } from '../../../src/components/ui/FadeSlideIn';
import { colors, radius, spacing } from '../../../src/theme/tokens';
import { vehiclesApi } from '../../../src/api/vehicles';
import type { Vehicle } from '../../../src/types/api';
import { formatCurrency } from '../../../src/lib/format';
import { VEHICLE_DISPLAY_NAME, VEHICLE_IMAGES } from '../../../src/lib/vehicleImages';
import { VEHICLE_TAGLINE } from '../../../src/lib/vehicleFeatures';

export default function FleetScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    vehiclesApi
      .list()
      .then(setVehicles)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load the fleet'));
  }, []);

  return (
    <ScreenContainer>
      <AppText variant="eyebrow" style={{ marginBottom: spacing.xs }}>
        Our Fleet
      </AppText>
      <AppText variant="display" style={{ marginBottom: spacing.lg }}>
        Every Journey, The Right Vehicle
      </AppText>

      {!vehicles && !error ? <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} /> : null}
      {error ? (
        <AppText variant="body" color={colors.destructive}>
          {error}
        </AppText>
      ) : null}
      {vehicles && vehicles.length === 0 ? (
        <AppText variant="bodyMuted">The fleet listing isn&apos;t available right now — please check back shortly.</AppText>
      ) : null}

      <View style={{ gap: spacing.md }}>
        {vehicles?.map((vehicle, i) => {
          const image = VEHICLE_IMAGES[vehicle.type];
          const displayName = VEHICLE_DISPLAY_NAME[vehicle.type] ?? vehicle.name;
          const tagline = VEHICLE_TAGLINE[vehicle.type];

          return (
            <FadeSlideIn key={vehicle.id} delay={i * 80}>
              <Pressable onPress={() => router.push(`/(app)/fleet/${vehicle.id}`)} style={styles.card}>
                {image ? <Image source={image} style={styles.image} resizeMode="cover" /> : null}
                <View style={styles.body}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="subheading">{displayName}</AppText>
                      <AppText variant="caption" style={{ marginTop: 2 }}>
                        {tagline}
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
                      <AppText variant="caption"> {vehicle.capacity_passengers} passengers</AppText>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="briefcase-outline" size={14} color={colors.mutedForeground} />
                      <AppText variant="caption"> {vehicle.capacity_luggage} bags</AppText>
                    </View>
                  </View>

                  <View style={styles.priceRow}>
                    <AppText variant="subheading" color={colors.gold}>
                      {`From ${formatCurrency(vehicle.base_rate)}`}
                    </AppText>
                  </View>
                </View>
              </Pressable>
            </FadeSlideIn>
          );
        })}
      </View>
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
  image: { width: '100%', height: 180 },
  body: { padding: spacing.md },
  metaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  priceRow: { marginTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm },
});

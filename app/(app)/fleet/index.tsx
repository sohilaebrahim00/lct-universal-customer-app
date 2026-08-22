import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { AlertCircle, Car, ChevronRight, Users, Briefcase } from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { FadeSlideIn } from '../../../src/components/ui/FadeSlideIn';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { colors, radius, spacing } from '../../../src/theme/tokens';
import { vehiclesApi } from '../../../src/api/vehicles';
import type { Vehicle } from '../../../src/types/api';
import { VEHICLE_DISPLAY_NAME, VEHICLE_IMAGES } from '../../../src/lib/vehicleImages';
import { VEHICLE_TAGLINE } from '../../../src/lib/vehicleFeatures';
import { publishedStartingLabel } from '../../../src/config/publishedFleet';

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
        <EmptyState icon={AlertCircle} title="Couldn't load the fleet" message={error} />
      ) : null}
      {vehicles && vehicles.length === 0 ? (
        <EmptyState icon={Car} title="Fleet unavailable" message="The fleet listing isn't available right now — please check back shortly." />
      ) : null}

      <View style={{ gap: spacing.md }}>
        {vehicles?.map((vehicle, i) => {
          const image = VEHICLE_IMAGES[vehicle.type];
          const displayName = VEHICLE_DISPLAY_NAME[vehicle.type] ?? vehicle.name;
          const tagline = VEHICLE_TAGLINE[vehicle.type];

          return (
            <FadeSlideIn key={vehicle.id} delay={i * 80}>
              <Pressable
                onPress={() => router.push(`/(app)/fleet/${vehicle.id}`)}
                style={styles.card}
                accessibilityRole="button"
                accessibilityLabel={`${displayName}, ${vehicle.capacity_passengers} passengers, ${vehicle.capacity_luggage} bags`}
              >
                {image ? <Image source={image} style={styles.image} resizeMode="cover" /> : null}
                <View style={styles.body}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="subheading">{displayName}</AppText>
                      <AppText variant="caption" style={{ marginTop: 2 }}>
                        {tagline}
                      </AppText>
                    </View>
                    <ChevronRight size={18} color={colors.mutedForeground} strokeWidth={1.5} />
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

                  {/*
                    The WEBSITE's published starting price, in every build, or
                    NOTHING.

                    It used to fall back to `From ${formatCurrency(base_rate)}`
                    whenever no published label was available — which, because
                    the label was gated on demo mode, meant every real build.
                    Against a live API that printed "From $65.00" for a sedan
                    that cannot be booked below $102.60, whose theoretical floor
                    with gratuity and tax is $83.38, and which the company
                    itself advertises at $95. Four numbers, and the app was
                    inventing the only one nobody had published.

                    A base rate is a component of a fare, not a price a customer
                    can pay. So there is no fallback now: an unpublished class
                    shows no figure at all, on the same null-driven rule as
                    `servicePolicy`. The booking flow still quotes an exact
                    all-in total — a floor is for browsing, a fare is for
                    committing.

                    The website and the backend still disagree; that is
                    BACKEND_FOLLOWUPS.md §6 and is deliberately not settled here.
                  */}
                  {publishedStartingLabel(vehicle.type) ? (
                    <View style={styles.priceRow}>
                      <AppText variant="subheading" color={colors.gold}>
                        {publishedStartingLabel(vehicle.type)}
                      </AppText>
                    </View>
                  ) : null}
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

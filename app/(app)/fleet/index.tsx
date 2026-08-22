import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AlertCircle, Car, ChevronRight, Users, Briefcase } from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { FadeSlideIn } from '../../../src/components/ui/FadeSlideIn';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { radius, space, theme } from '../../../src/theme';
import { vehiclesApi } from '../../../src/api/vehicles';
import type { Vehicle } from '../../../src/types/api';
import { VEHICLE_DISPLAY_NAME, VEHICLE_IMAGES } from '../../../src/lib/vehicleImages';
import { VEHICLE_TAGLINE } from '../../../src/lib/vehicleFeatures';
import { publishedStartingLabel } from '../../../src/config/publishedFleet';
import { AppImage } from '../../../src/components/ui/AppImage';

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
      <AppText variant="eyebrow" style={{ marginBottom: space.xs }}>
        Our Fleet
      </AppText>
      <AppText variant="display" style={{ marginBottom: space.lg }}>
        Every Journey, The Right Vehicle
      </AppText>

      {!vehicles && !error ? <ActivityIndicator color={theme.content.accent} style={{ marginTop: space.xl }} /> : null}
      {error ? (
        <EmptyState icon={AlertCircle} title="Couldn't load the fleet" message={error} />
      ) : null}
      {vehicles && vehicles.length === 0 ? (
        <EmptyState icon={Car} title="Fleet unavailable" message="The fleet listing isn't available right now — please check back shortly." />
      ) : null}

      <View style={{ gap: space.md }}>
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
                {image ? <AppImage source={image} style={styles.image} /> : null}
                <View style={styles.body}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="subheading">{displayName}</AppText>
                      <AppText variant="caption" style={{ marginTop: 2 }}>
                        {tagline}
                      </AppText>
                    </View>
                    <ChevronRight size={18} color={theme.content.secondary} strokeWidth={1.5} />
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Users size={14} color={theme.content.secondary} strokeWidth={1.5} />
                      <AppText variant="caption"> {vehicle.capacity_passengers} passengers</AppText>
                    </View>
                    <View style={styles.metaItem}>
                      <Briefcase size={14} color={theme.content.secondary} strokeWidth={1.5} />
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
                      <AppText variant="subheading" color={theme.content.accent}>
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
    borderColor: theme.border.hairline,
    backgroundColor: theme.background.secondary,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 180 },
  body: { padding: space.md },
  metaRow: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  priceRow: { marginTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.hairline, paddingTop: space.sm },
});

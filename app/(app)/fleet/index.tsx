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
import { FLEET_CATALOGUE, fleetAccessibilityLabel } from '../../../src/config/fleetCatalogue';
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
        {FLEET_CATALOGUE.map((entry, i) => {
          /*
            The API row is the AUTHORITY for a bookable class: its capacities
            come from there, so this catalogue never holds a second copy of a
            number the fare engine also uses. A display-only class has no row,
            and the catalogue's own figures are all there is.
          */
          const row = entry.vehicleType ? vehicles?.find((v) => v.type === entry.vehicleType) : undefined;
          const passengers = row?.capacity_passengers ?? entry.passengers;
          const luggage = row ? row.capacity_luggage : entry.luggage;
          const bookable = entry.pricingMode === 'bookable' && Boolean(row);

          return (
            <FadeSlideIn key={entry.key} delay={i * 60}>
              <Pressable
                /*
                  Only a class with a real row opens the vehicle detail. A
                  display-only class has nothing to open and is not pressable —
                  a control that leads nowhere is worse than no control.
                */
                onPress={bookable && row ? () => router.push(`/(app)/fleet/${row.id}`) : undefined}
                disabled={!bookable}
                style={styles.card}
                accessibilityRole={bookable ? 'button' : 'text'}
                accessibilityLabel={fleetAccessibilityLabel({ ...entry, passengers, luggage })}
              >
                {entry.image ? (
                  <AppImage source={entry.image} style={styles.image} contentFit="contain" />
                ) : (
                  /*
                    ASSET REQUIRED. The supplied image for this class has
                    malformed lettering and is deliberately not published. The
                    CLASS still appears — a customer looking for a 40-seat coach
                    should find one — and it is the photograph that is missing,
                    which the card says rather than implies.
                  */
                  <View style={styles.imagePending}>
                    <Car size={28} color={theme.content.tertiary} strokeWidth={1.5} />
                    <AppText variant="captionSm" color={theme.content.tertiary} style={{ marginTop: space.xs }}>
                      Photograph coming soon
                    </AppText>
                  </View>
                )}
                <View style={styles.body}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="subheading">{entry.name}</AppText>
                      <AppText variant="caption" style={{ marginTop: 2 }}>
                        {entry.description}
                      </AppText>
                    </View>
                    {bookable ? <ChevronRight size={18} color={theme.content.secondary} strokeWidth={1.5} /> : null}
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Users size={14} color={theme.content.secondary} strokeWidth={1.5} />
                      <AppText variant="caption"> {passengers} passengers</AppText>
                    </View>
                    {/* Luggage only where the business has confirmed it. */}
                    {luggage !== null && luggage !== undefined ? (
                      <View style={styles.metaItem}>
                        <Briefcase size={14} color={theme.content.secondary} strokeWidth={1.5} />
                        <AppText variant="caption"> {luggage} bags</AppText>
                      </View>
                    ) : null}
                  </View>

                  {/*
                    THE PRICE ROW.

                    A bookable class shows the WEBSITE's published starting
                    label — never a base rate, which is a component of a fare
                    and not a price anyone can pay. A quote-only class shows the
                    label the business publishes for it, or the app's existing
                    "Request Quote" wording, and says a person confirms it.
                  */}
                  <View style={styles.priceRow}>
                    <AppText variant="subheading" color={theme.content.accent}>
                      {entry.priceLabel}
                    </AppText>
                    {entry.pricingMode === 'request-quote' ? (
                      <AppText variant="captionSm" color={theme.content.tertiary} style={{ marginTop: 2 }}>
                        Our team confirms the fare for this class before you commit.
                      </AppText>
                    ) : null}
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
    borderColor: theme.border.hairline,
    backgroundColor: theme.background.secondary,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 180 },
  /* The reserved box a held asset leaves — same height, so nothing shifts. */
  imagePending: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.background.inset,
  },
  body: { padding: space.md },
  metaRow: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  priceRow: { marginTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.hairline, paddingTop: space.sm },
});

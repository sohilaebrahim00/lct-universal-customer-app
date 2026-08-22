import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { Building2, Users, Briefcase, FileText, Headphones } from 'lucide-react-native';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Divider } from '../../src/components/ui/Divider';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { AppText } from '../../src/components/ui/Typography';
import { FadeSlideIn } from '../../src/components/ui/FadeSlideIn';
import { space, theme } from '../../src/theme';
import { vehiclesApi } from '../../src/api/vehicles';
import { publishedStartingLabel } from '../../src/config/publishedFleet';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { Skeleton } from '../../src/components/ui/Skeleton';
import { asyncState, type AsyncState } from '../../src/lib/asyncState';
import type { Vehicle } from '../../src/types/api';
import { VEHICLE_DISPLAY_NAME } from '../../src/lib/vehicleImages';

const FEATURES = [
  { icon: Building2, title: 'Corporate Transportation', desc: 'A dedicated account for your company, with centralized billing and reporting.' },
  { icon: Users, title: 'Employee Rides', desc: 'Give your team a simple way to book rides, with optional manager approval.' },
  { icon: Briefcase, title: 'Executive Travel', desc: 'Priority chauffeurs and vehicles for leadership and client-facing travel.' },
  { icon: FileText, title: 'Monthly Billing', desc: 'One consolidated invoice per month instead of per-trip receipts.' },
  { icon: Headphones, title: 'Dedicated Support', desc: 'A direct line to our corporate team for scheduling and account questions.' },
];

const CONTACT_EMAIL = 'reservations@lctuniversal.com';
const CONTACT_PHONE_DISPLAY = '+1 (888) 615-4065';
const CONTACT_PHONE_TEL = '+18886154065';

export default function CorporateInfoScreen() {
  const router = useRouter();
  /*
   * FOUR STATES, not two.
   *
   * This was `.catch(() => setVehicles([]))` — which does not merely swallow
   * the error, it CONVERTS IT INTO AN EMPTY SUCCESS. A failed fetch and a
   * genuinely empty fleet rendered identically, and neither offered a retry, on
   * the screen aimed at the customers most likely to notice.
   */
  const [state, setState] = useState<AsyncState<Vehicle[]>>(asyncState.loading<Vehicle[]>());

  const load = useCallback(() => {
    setState(asyncState.loading<Vehicle[]>());
    vehiclesApi
      .list()
      .then((vehicles) =>
        setState(vehicles.length > 0 ? asyncState.success(vehicles) : asyncState.empty<Vehicle[]>()),
      )
      .catch((cause: unknown) =>
        setState(asyncState.error<Vehicle[]>(cause instanceof Error ? cause : new Error(String(cause)))),
      );
  }, []);

  useEffect(() => {
    // Deferred a microtask so the load's setState never lands synchronously
    // inside the effect body — the idiom used throughout this codebase.
    void Promise.resolve().then(load);
  }, [load]);

  return (
    <ScreenContainer padded={false}>
      <Image source={require('../../assets/corporate/hero.jpg')} style={styles.hero} resizeMode="cover" />
      <View style={styles.heroOverlay} />
      <View style={styles.heroContent}>
        <AppText variant="eyebrow" style={{ marginBottom: space.xs }}>
          For Business
        </AppText>
        <AppText variant="display">Corporate Transportation</AppText>
      </View>

      <View style={{ padding: space.lg }}>
        <FadeSlideIn>
          <AppText variant="bodyMuted" style={{ marginBottom: space.xl }}>
            LCT Universal partners with businesses across Dallas–Fort Worth to move executives, employees, and
            clients reliably — with the accountability of a single corporate account.
          </AppText>
        </FadeSlideIn>

        <View style={{ marginBottom: space.xl }}>
          {FEATURES.map((feature, i) => (
            <FadeSlideIn key={feature.title} delay={i * 60}>
              {/*
                The row lives INSIDE the card, not on it.

                This passed `flexDirection: 'row'` through `Card`'s `style`
                prop — which lands on the Surface, whose only child is Card's
                own padding `View`. So the row direction applied to a container
                holding one element and did nothing at all: the icon stacked
                above the title, and the description sized to its own content
                and was clipped by the Surface's `overflow: hidden`.

                It typechecked, it linted, and it rendered without an error.
                See the note added to `Card`.
              */}
              <Card style={styles.featureCard}>
                <View style={styles.featureRow}>
                  <feature.icon
                    size={22}
                    color={theme.content.accent}
                    strokeWidth={1.5}
                    style={styles.featureIcon}
                  />
                  {/*
                    `minWidth: 0` alongside `flex: 1` — a flex child's default
                    `min-width: auto` lets the text's intrinsic width win over
                    the basis, so the row grows past its container instead of
                    the text wrapping inside it. Same cause as the Home service
                    tiles needing `flexBasis: 0`.
                  */}
                  <View style={styles.featureText}>
                    <AppText variant="subheading">{feature.title}</AppText>
                    <AppText variant="caption" style={styles.featureDesc}>
                      {feature.desc}
                    </AppText>
                  </View>
                </View>
              </Card>
            </FadeSlideIn>
          ))}
        </View>

        <FadeSlideIn delay={260}>
          <AppText variant="heading" style={{ marginBottom: space.sm }}>
            Pricing Preview
          </AppText>
          <Card style={{ marginBottom: space.xl }}>
            {state.status === 'loading' ? (
              <Skeleton.Bar width="70%" />
            ) : state.status === 'error' ? (
              /*
                An error, with a way out of it. The old copy — "Rates aren't
                available right now" — was shown for BOTH a failure and an empty
                fleet, so it was true in one case and a euphemism in the other.
              */
              <ErrorState
                title="We couldn't load our rates"
                message="This is our end. Our team can send them to you directly."
                onRetry={load}
              />
            ) : state.status === 'empty' ? (
              <AppText variant="bodyMuted">
                Rates aren&apos;t published for these classes — please contact sales below.
              </AppText>
            ) : (
              (state.data ?? []).map((vehicle, i) => (
                <View key={vehicle.id}>
                  {i > 0 ? <Divider /> : null}
                  <View style={styles.rateRow}>
                    <AppText variant="body">{VEHICLE_DISPLAY_NAME[vehicle.type] ?? vehicle.name}</AppText>
                    {/*
                      THE PUBLISHED LABEL, or nothing — the same rule as Fleet.

                      This printed `From ${formatCurrency(base_rate)}` — "From
                      $65.00" — for a journey that cannot cost less than
                      $102.60, whose floor with gratuity and tax is $83.38, and
                      which the company advertises at $95. The identical defect
                      fixed on Fleet in the backend-integration slice, still
                      live here, on the screen aimed at the customers most
                      likely to check.

                      The hourly branch was the same error in another currency:
                      `$100.00/hr` is a backend rate nobody published.
                    */}
                    {publishedStartingLabel(vehicle.type) ? (
                      <AppText variant="subheading" color={theme.content.accent}>
                        {publishedStartingLabel(vehicle.type)}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </Card>
        </FadeSlideIn>

        <FadeSlideIn delay={320}>
          <AppText variant="heading" style={{ marginBottom: space.sm }}>
            Get Started
          </AppText>
          <AppText variant="bodyMuted" style={{ marginBottom: space.md }}>
            Speak with our corporate team to set up your account, billing preferences, and approval workflow.
          </AppText>
          <Button
            label="Contact Corporate Team"
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Corporate Account Inquiry`)}
            style={{ marginBottom: space.sm }}
          />
          <Button
            label={`Call ${CONTACT_PHONE_DISPLAY}`}
            variant="secondary"
            onPress={() => Linking.openURL(`tel:${CONTACT_PHONE_TEL}`)}
            style={{ marginBottom: space.sm }}
          />
          <Button label="Book a Ride Now" variant="ghost" onPress={() => router.push('/(app)/book')} />
        </FadeSlideIn>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  /*
   * The card must FILL its container, not size to its content.
   *
   * It was 512px wide inside a 412px parent that clips, so the description ran
   * off the right edge and was cut mid-word — "with centralized billi". A
   * row-direction flex container sizes to max-content unless told otherwise,
   * and the text container's own `flex: 1; minWidth: 0` cannot rescue it while
   * the card around it is the thing overflowing.
   *
   * Found by the screenshot sweep. It typechecks, it lints, and it renders
   * without a single error — right up until you look at it.
   */
  featureCard: { marginBottom: space.sm },
  /** The row that `Card`'s style prop could never have been. */
  featureRow: { flexDirection: 'row', alignItems: 'flex-start' },
  featureIcon: { marginTop: 2, flexShrink: 0 },
  featureDesc: { marginTop: 2 },
  featureText: { marginLeft: space.md, flex: 1, minWidth: 0 },
  hero: { width: '100%', height: 220 },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 220, backgroundColor: 'rgba(2,2,1,0.5)' },
  heroContent: { position: 'absolute', top: 0, left: 0, right: 0, padding: space.lg, paddingTop: space.xxl },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.xs },
});

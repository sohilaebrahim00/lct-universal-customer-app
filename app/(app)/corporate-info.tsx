import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Divider } from '../../src/components/ui/Divider';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { AppText } from '../../src/components/ui/Typography';
import { FadeSlideIn } from '../../src/components/ui/FadeSlideIn';
import { colors, spacing } from '../../src/theme/tokens';
import { vehiclesApi } from '../../src/api/vehicles';
import type { Vehicle } from '../../src/types/api';
import { formatCurrency } from '../../src/lib/format';
import { VEHICLE_DISPLAY_NAME } from '../../src/lib/vehicleImages';

const FEATURES = [
  { icon: 'business-outline' as const, title: 'Corporate Transportation', desc: 'A dedicated account for your company, with centralized billing and reporting.' },
  { icon: 'people-outline' as const, title: 'Employee Rides', desc: 'Give your team a simple way to book rides, with optional manager approval.' },
  { icon: 'briefcase-outline' as const, title: 'Executive Travel', desc: 'Priority chauffeurs and vehicles for leadership and client-facing travel.' },
  { icon: 'document-text-outline' as const, title: 'Monthly Billing', desc: 'One consolidated invoice per month instead of per-trip receipts.' },
  { icon: 'headset-outline' as const, title: 'Dedicated Support', desc: 'A direct line to our corporate team for scheduling and account questions.' },
];

const CONTACT_EMAIL = 'reservations@lctuniversal.com';
const CONTACT_PHONE_DISPLAY = '+1 (888) 615-4065';
const CONTACT_PHONE_TEL = '+18886154065';

export default function CorporateInfoScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);

  useEffect(() => {
    vehiclesApi.list().then(setVehicles).catch(() => setVehicles([]));
  }, []);

  return (
    <ScreenContainer padded={false}>
      <Image source={require('../../assets/corporate/hero.jpg')} style={styles.hero} resizeMode="cover" />
      <View style={styles.heroOverlay} />
      <View style={styles.heroContent}>
        <AppText variant="eyebrow" style={{ marginBottom: spacing.xs }}>
          For Business
        </AppText>
        <AppText variant="display">Corporate Transportation</AppText>
      </View>

      <View style={{ padding: spacing.lg }}>
        <FadeSlideIn>
          <AppText variant="bodyMuted" style={{ marginBottom: spacing.xl }}>
            LCT Universal partners with businesses across Dallas–Fort Worth to move executives, employees, and
            clients reliably — with the accountability of a single corporate account.
          </AppText>
        </FadeSlideIn>

        <View style={{ marginBottom: spacing.xl }}>
          {FEATURES.map((feature, i) => (
            <FadeSlideIn key={feature.title} delay={i * 60}>
              <Card style={{ marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons name={feature.icon} size={22} color={colors.gold} style={{ marginTop: 2 }} />
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <AppText variant="subheading">{feature.title}</AppText>
                  <AppText variant="caption" style={{ marginTop: 2 }}>
                    {feature.desc}
                  </AppText>
                </View>
              </Card>
            </FadeSlideIn>
          ))}
        </View>

        <FadeSlideIn delay={260}>
          <AppText variant="heading" style={{ marginBottom: spacing.sm }}>
            Pricing Preview
          </AppText>
          <Card style={{ marginBottom: spacing.xl }}>
            {vehicles === null ? (
              <AppText variant="bodyMuted">Loading rates…</AppText>
            ) : vehicles.length === 0 ? (
              <AppText variant="bodyMuted">Rates aren&apos;t available right now — please contact sales below.</AppText>
            ) : (
              vehicles.map((vehicle, i) => (
                <View key={vehicle.id}>
                  {i > 0 ? <Divider /> : null}
                  <View style={styles.rateRow}>
                    <AppText variant="body">{VEHICLE_DISPLAY_NAME[vehicle.type] ?? vehicle.name}</AppText>
                    <AppText variant="subheading" color={colors.gold}>
                      {vehicle.per_hour_rate ? `${formatCurrency(vehicle.per_hour_rate)}/hr` : `From ${formatCurrency(vehicle.base_rate)}`}
                    </AppText>
                  </View>
                </View>
              ))
            )}
          </Card>
        </FadeSlideIn>

        <FadeSlideIn delay={320}>
          <AppText variant="heading" style={{ marginBottom: spacing.sm }}>
            Get Started
          </AppText>
          <AppText variant="bodyMuted" style={{ marginBottom: spacing.md }}>
            Speak with our corporate team to set up your account, billing preferences, and approval workflow.
          </AppText>
          <Button
            label="Contact Corporate Team"
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Corporate Account Inquiry`)}
            style={{ marginBottom: spacing.sm }}
          />
          <Button
            label={`Call ${CONTACT_PHONE_DISPLAY}`}
            variant="secondary"
            onPress={() => Linking.openURL(`tel:${CONTACT_PHONE_TEL}`)}
            style={{ marginBottom: spacing.sm }}
          />
          <Button label="Book a Ride Now" variant="ghost" onPress={() => router.push('/(app)/book')} />
        </FadeSlideIn>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 220 },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 220, backgroundColor: 'rgba(2,2,1,0.5)' },
  heroContent: { position: 'absolute', top: 0, left: 0, right: 0, padding: spacing.lg, paddingTop: spacing.xxl },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
});

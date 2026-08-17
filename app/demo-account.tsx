import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';
import { Divider } from '../src/components/ui/Divider';
import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { StatusPill } from '../src/components/ui/StatusPill';
import { AppText } from '../src/components/ui/Typography';
import { FadeSlideIn } from '../src/components/ui/FadeSlideIn';
import { colors, radius, spacing } from '../src/theme/tokens';

const DEMO_PROFILE = { name: 'Alexandra Bennett', email: 'alexandra.bennett@example.com', phone: '+1 (214) 555-0148' };

const DEMO_UPCOMING = { service: 'Airport Transfer', when: 'Tomorrow, 8:00 AM', vehicle: 'Mercedes-Benz S-Class', fare: '$145.00' };

const DEMO_HISTORY = [
  { service: 'Corporate Travel', when: 'Aug 12, 2:30 PM', fare: '$210.00' },
  { service: 'Hourly Chauffeur', when: 'Aug 3, 6:00 PM', fare: '$480.00' },
  { service: 'Airport Transfer', when: 'Jul 22, 9:15 AM', fare: '$135.00' },
];

const DEMO_LOCATIONS = [
  { icon: 'home-outline' as const, label: 'Home', address: '4820 Maple Ave, Dallas, TX' },
  { icon: 'business-outline' as const, label: 'Office', address: '2100 Ross Ave, Dallas, TX' },
  { icon: 'airplane-outline' as const, label: 'DFW Airport', address: '2400 Aviation Dr, DFW Airport, TX' },
];

const DEMO_NOTIFICATIONS = [
  { title: 'Driver Assigned', body: 'Marcus Bennett will be your chauffeur tomorrow at 8:00 AM.', when: '2 hours ago' },
  { title: 'Trip Completed', body: 'Your Corporate Travel trip on Aug 12 is complete. Thanks for riding with us.', when: '5 days ago' },
];

export default function DemoAccountScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <View style={styles.badge}>
        <Ionicons name="sparkles-outline" size={14} color={colors.surfaceBlack} />
        <AppText variant="caption" color={colors.surfaceBlack} style={{ marginLeft: spacing.xs, fontWeight: '700' as const }}>
          DEMO ACCOUNT
        </AppText>
      </View>

      <AppText variant="display" style={{ marginBottom: spacing.xs }}>
        Customer Dashboard
      </AppText>
      <AppText variant="bodyMuted" style={{ marginBottom: spacing.xl }}>
        A preview of the dashboard a signed-in client sees. No real account is created and nothing here is saved.
      </AppText>

      <FadeSlideIn>
        <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={22} color={colors.gold} />
          </View>
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <AppText variant="subheading">{DEMO_PROFILE.name}</AppText>
            <AppText variant="bodyMuted">{DEMO_PROFILE.email}</AppText>
            <AppText variant="bodyMuted">{DEMO_PROFILE.phone}</AppText>
          </View>
        </Card>
      </FadeSlideIn>

      <FadeSlideIn delay={60}>
        <AppText variant="heading" style={{ marginBottom: spacing.sm }}>
          Upcoming Trip
        </AppText>
        <Card style={{ marginBottom: spacing.lg }}>
          <AppText variant="subheading" style={{ marginBottom: spacing.xs }}>
            {DEMO_UPCOMING.service}
          </AppText>
          <AppText variant="caption" style={{ marginBottom: spacing.sm }}>
            {DEMO_UPCOMING.when} · {DEMO_UPCOMING.vehicle}
          </AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <StatusPill status="driver_assigned" />
            <AppText variant="subheading" color={colors.gold}>
              {DEMO_UPCOMING.fare}
            </AppText>
          </View>
        </Card>
      </FadeSlideIn>

      <FadeSlideIn delay={100}>
        <AppText variant="heading" style={{ marginBottom: spacing.sm }}>
          Trip History
        </AppText>
        <Card style={{ marginBottom: spacing.lg }}>
          {DEMO_HISTORY.map((trip, i) => (
            <View key={trip.service + trip.when}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
                <View>
                  <AppText variant="body">{trip.service}</AppText>
                  <AppText variant="caption">{trip.when}</AppText>
                </View>
                <AppText variant="body" color={colors.gold}>
                  {trip.fare}
                </AppText>
              </View>
            </View>
          ))}
        </Card>
      </FadeSlideIn>

      <FadeSlideIn delay={140}>
        <AppText variant="heading" style={{ marginBottom: spacing.sm }}>
          Saved Locations
        </AppText>
        <Card style={{ marginBottom: spacing.lg }}>
          {DEMO_LOCATIONS.map((loc, i) => (
            <View key={loc.label}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs }}>
                <Ionicons name={loc.icon} size={18} color={colors.gold} />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <AppText variant="body">{loc.label}</AppText>
                  <AppText variant="caption">{loc.address}</AppText>
                </View>
              </View>
            </View>
          ))}
        </Card>
      </FadeSlideIn>

      <FadeSlideIn delay={180}>
        <AppText variant="heading" style={{ marginBottom: spacing.sm }}>
          Notifications
        </AppText>
        <Card style={{ marginBottom: spacing.xl }}>
          {DEMO_NOTIFICATIONS.map((n, i) => (
            <View key={n.title}>
              {i > 0 ? <Divider /> : null}
              <View style={{ paddingVertical: spacing.xs }}>
                <AppText variant="subheading">{n.title}</AppText>
                <AppText variant="bodyMuted" style={{ marginVertical: 2 }}>
                  {n.body}
                </AppText>
                <AppText variant="caption">{n.when}</AppText>
              </View>
            </View>
          ))}
        </Card>
      </FadeSlideIn>

      <Button label="Create a Real Account" onPress={() => router.push('/(auth)/signup')} style={{ marginBottom: spacing.sm }} />
      <Button label="Exit Demo" variant="ghost" onPress={() => router.replace('/welcome')} />
    </ScreenContainer>
  );
}

const styles = {
  badge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.charcoal,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};

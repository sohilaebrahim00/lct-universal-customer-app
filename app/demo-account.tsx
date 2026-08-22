import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Sparkles, User, Home, Building2, Plane } from 'lucide-react-native';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';
import { Divider } from '../src/components/ui/Divider';
import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { StatusPill } from '../src/components/ui/StatusPill';
import { AppText } from '../src/components/ui/Typography';
import { FadeSlideIn } from '../src/components/ui/FadeSlideIn';
import { radius, space, theme } from '../src/theme';

const DEMO_PROFILE = { name: 'Alexandra Bennett', email: 'alexandra.bennett@example.com', phone: '+1 (214) 555-0148' };

const DEMO_UPCOMING = { service: 'Airport Transfer', when: 'Tomorrow, 8:00 AM', vehicle: 'Mercedes-Benz S-Class', fare: '$145.00' };

const DEMO_HISTORY = [
  { service: 'Corporate Travel', when: 'Aug 12, 2:30 PM', fare: '$210.00' },
  { service: 'Hourly Chauffeur', when: 'Aug 3, 6:00 PM', fare: '$480.00' },
  { service: 'Airport Transfer', when: 'Jul 22, 9:15 AM', fare: '$135.00' },
];

const DEMO_LOCATIONS = [
  { icon: Home, label: 'Home', address: '4820 Maple Ave, Dallas, TX' },
  { icon: Building2, label: 'Office', address: '2100 Ross Ave, Dallas, TX' },
  { icon: Plane, label: 'DFW Airport', address: '2400 Aviation Dr, DFW Airport, TX' },
];

const DEMO_NOTIFICATIONS = [
  // No chauffeur name. The rest of this screen is labelled sample data and says
  // so, but naming a chauffeur implies a real employee in a way that naming a
  // sample customer does not — and the app refuses to invent chauffeur identity
  // everywhere else (see BACKEND_FOLLOWUPS.md sections 1 and 2).
  { title: 'Chauffeur assigned', body: 'Your chauffeur has been assigned for tomorrow at 8:00 AM.', when: '2 hours ago' },
  { title: 'Trip Completed', body: 'Your Corporate Travel trip on Aug 12 is complete. Thanks for riding with us.', when: '5 days ago' },
];

export default function DemoAccountScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <View style={styles.badge}>
        <Sparkles size={14} color={theme.background.primary} strokeWidth={1.5} />
        <AppText variant="caption" color={theme.background.primary} style={{ marginStart: space.xs, fontWeight: '700' as const }}>
          DEMO ACCOUNT
        </AppText>
      </View>

      <AppText variant="display" style={{ marginBottom: space.xs }}>
        Customer Dashboard
      </AppText>
      <AppText variant="bodyMuted" style={{ marginBottom: space.xl }}>
        A preview of the dashboard a signed-in client sees. No real account is created and nothing here is saved.
      </AppText>

      <FadeSlideIn>
        <Card row style={{ marginBottom: space.lg }}>
          <View style={styles.avatar}>
            <User size={22} color={theme.content.accent} strokeWidth={1.5} />
          </View>
          <View style={{ marginStart: space.md, flex: 1 }}>
            <AppText variant="subheading">{DEMO_PROFILE.name}</AppText>
            <AppText variant="bodyMuted">{DEMO_PROFILE.email}</AppText>
            <AppText variant="bodyMuted">{DEMO_PROFILE.phone}</AppText>
          </View>
        </Card>
      </FadeSlideIn>

      <FadeSlideIn delay={60}>
        <AppText variant="heading" style={{ marginBottom: space.sm }}>
          Upcoming Trip
        </AppText>
        <Card style={{ marginBottom: space.lg }}>
          <AppText variant="subheading" style={{ marginBottom: space.xs }}>
            {DEMO_UPCOMING.service}
          </AppText>
          <AppText variant="caption" style={{ marginBottom: space.sm }}>
            {DEMO_UPCOMING.when} · {DEMO_UPCOMING.vehicle}
          </AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <StatusPill status="driver_assigned" />
            <AppText variant="subheading" color={theme.content.accent}>
              {DEMO_UPCOMING.fare}
            </AppText>
          </View>
        </Card>
      </FadeSlideIn>

      <FadeSlideIn delay={100}>
        <AppText variant="heading" style={{ marginBottom: space.sm }}>
          Trip History
        </AppText>
        <Card style={{ marginBottom: space.lg }}>
          {DEMO_HISTORY.map((trip, i) => (
            <View key={trip.service + trip.when}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.xs }}>
                <View>
                  <AppText variant="body">{trip.service}</AppText>
                  <AppText variant="caption">{trip.when}</AppText>
                </View>
                <AppText variant="body" color={theme.content.accent}>
                  {trip.fare}
                </AppText>
              </View>
            </View>
          ))}
        </Card>
      </FadeSlideIn>

      <FadeSlideIn delay={140}>
        <AppText variant="heading" style={{ marginBottom: space.sm }}>
          Saved Locations
        </AppText>
        <Card style={{ marginBottom: space.lg }}>
          {DEMO_LOCATIONS.map((loc, i) => (
            <View key={loc.label}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.xs }}>
                <loc.icon size={18} color={theme.content.accent} strokeWidth={1.5} />
                <View style={{ marginStart: space.sm, flex: 1 }}>
                  <AppText variant="body">{loc.label}</AppText>
                  <AppText variant="caption">{loc.address}</AppText>
                </View>
              </View>
            </View>
          ))}
        </Card>
      </FadeSlideIn>

      <FadeSlideIn delay={180}>
        <AppText variant="heading" style={{ marginBottom: space.sm }}>
          Notifications
        </AppText>
        <Card style={{ marginBottom: space.xl }}>
          {DEMO_NOTIFICATIONS.map((n, i) => (
            <View key={n.title}>
              {i > 0 ? <Divider /> : null}
              <View style={{ paddingVertical: space.xs }}>
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

      <Button label="Create a Real Account" onPress={() => router.push('/(auth)/signup')} style={{ marginBottom: space.sm }} />
      <Button label="Exit Demo" variant="ghost" onPress={() => router.replace('/welcome')} />
    </ScreenContainer>
  );
}

const styles = {
  badge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    backgroundColor: theme.content.accent,
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    marginBottom: space.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: theme.background.tertiary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};

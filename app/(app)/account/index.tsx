import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Bell,
  Briefcase,
  Building2,
  Car,
  Clock,
  CreditCard,
  Info,
  LayoutGrid,
  LogOut,
  MapPin,
  Navigation,
  RotateCcw,
  Settings,
  UserCircle,
  Users,
} from 'lucide-react-native';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListRow } from '../../../src/components/ui/ListRow';
import { ScreenHeader } from '../../../src/components/ui/ScreenHeader';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import { Surface } from '../../../src/components/ui/Surface';
import { AppText } from '../../../src/components/ui/Typography';

import { useAuthStore } from '../../../src/store/authStore';
import { isDemoMode, resetDemo } from '../../../src/lib/demoReset';
import { useToast } from '../../../src/components/ui/Toast';
import { gutter, space, theme } from '../../../src/theme';

/**
 * Slice 2 wires this screen onto the shared primitives — `ListRow` in grouped
 * `Surface`s, `SectionHeader`, `Badge`, `ScreenHeader` — and adds the "Our
 * fleet" row that Fleet needs now that it is a route rather than a tab.
 *
 * The full iOS-Settings-grade pass (artboard 2m: profile card, corporate badge
 * placement, destructive actions moved inside each detail screen behind a
 * confirm dialog) is slice 11. What is here is the wiring, not the redesign.
 */
export default function AccountScreen() {
  const router = useRouter();
  const toast = useToast();
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  if (status !== 'signed-in') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ScreenHeader title="Account" />

        <Card style={styles.block}>
          <EmptyState
            icon={UserCircle}
            title="You're browsing as a guest"
            message="Sign in to save payment methods, view trip history, and manage your profile."
            action={
              <View style={styles.guestActions}>
                <Button label="Sign in" onPress={() => router.push('/(auth)/login')} />
                <Button
                  label="Create account"
                  variant="secondary"
                  onPress={() => router.push('/(auth)/signup')}
                />
              </View>
            }
          />
        </Card>

        <SectionHeader title="About" />
        <Surface level="card" style={styles.block}>
          <ListRow icon={Car} title="Our fleet" onPress={() => router.push('/(app)/fleet')} />
          <ListRow icon={Building2} title="About LCT Universal" onPress={() => router.push('/(app)/about')} />
          <ListRow icon={Briefcase} title="Corporate accounts" onPress={() => router.push('/(app)/corporate-info')} />
          <ListRow
            icon={Navigation}
            title="Preview live tracking"
            divider={false}
            onPress={() => router.push('/(app)/demo-trip')}
          />
        </Surface>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Account" />

      <Card style={styles.block}>
        <View style={styles.profileRow}>
          <Avatar name={profile?.full_name ?? null} uri={profile?.avatar_url ?? null} size="lg" />
          <View style={styles.profileText}>
            <AppText variant="subheading" numberOfLines={1}>
              {profile?.full_name ?? '—'}
            </AppText>
            <AppText variant="captionSm" numberOfLines={1}>
              {profile?.email ?? '—'}
            </AppText>
          </View>
          <Button
            label="Edit"
            variant="secondary"
            size="sm"
            onPress={() => router.push('/(app)/account/edit-profile')}
          />
        </View>
      </Card>

      {profile?.corporate_account_id ? (
        <Badge label="Corporate account" tone="accent" style={styles.badge} />
      ) : null}

      <SectionHeader title="Travel" />
      <Surface level="card" style={styles.block}>
        <ListRow icon={MapPin} title="Saved locations" onPress={() => router.push('/(app)/account/saved-locations')} />
        <ListRow icon={Users} title="Saved passengers" onPress={() => router.push('/(app)/account/saved-passengers')} />
        <ListRow
          icon={CreditCard}
          title="Payment methods"
          onPress={() => router.push('/(app)/account/payment-methods')}
        />
        <ListRow icon={Clock} title="Trip history" divider={false} onPress={() => router.push('/(app)/trips')} />
      </Surface>

      <SectionHeader title="App" />
      <Surface level="card" style={styles.block}>
        <ListRow icon={Bell} title="Notifications" onPress={() => router.push('/(app)/account/notifications')} />
        <ListRow icon={Settings} title="Settings" divider={false} onPress={() => router.push('/(app)/account/settings')} />
      </Surface>

      <SectionHeader title="About" />
      <Surface level="card" style={styles.block}>
        {/* Fleet is a route now, not a tab — this is where browsing it lives. */}
        <ListRow icon={Car} title="Our fleet" onPress={() => router.push('/(app)/fleet')} />
        <ListRow icon={Info} title="About LCT Universal" onPress={() => router.push('/(app)/about')} />
        {profile?.corporate_account_id ? (
          <ListRow
            icon={Building2}
            title="Corporate account"
            divider={false}
            onPress={() => router.push('/(app)/account/corporate')}
          />
        ) : (
          <ListRow
            icon={Briefcase}
            title="Corporate solutions"
            divider={false}
            onPress={() => router.push('/(app)/corporate-info')}
          />
        )}
      </Surface>

      {/*
        ROLE PREVIEW — demo builds only.

        Three views of one dataset: the client's app (where you already are),
        the chauffeur's, and the dispatcher's. Switching changes the view, not
        the data — a ride booked here appears on the board, and a status a
        chauffeur sets appears on the client's tracking screen.

        A push to a path string rather than an imported component, deliberately:
        `app/_role/` is stripped from any non-demo build, and a static
        import would fail to resolve there. Same reason `resetDemo` lazily
        requires the demo store.
      */}
      {isDemoMode ? (
        <>
          <SectionHeader title="Role preview" />
          <Surface level="card" style={styles.block}>
            <ListRow
              icon={Car}
              title="Chauffeur view"
              subtitle="Today's jobs, kerbside detail, status"
              onPress={() => router.push('/_role/chauffeur')}
            />
            <ListRow
              icon={LayoutGrid}
              title="Dispatcher view"
              subtitle="Today's board and ride assignment"
              divider={false}
              onPress={() => router.push('/_role/dispatcher')}
            />
          </Surface>
          <AppText variant="captionSm" style={styles.previewNote}>
            Previews of two products LCT does not have yet, built from this demo&apos;s data. Not part of the client
            app.
          </AppText>
        </>
      ) : null}

      {/*
        Demo builds only. Lets whoever is presenting clear the trips a previous
        viewer booked — and now also the chauffeur assignments and statuses set
        in the role preview — so every showing starts from the same place.
      */}
      {isDemoMode ? (
        <Surface level="card" style={styles.block}>
          <ListRow
            icon={RotateCcw}
            title="Reset demo"
            subtitle="Clears any trips booked during this preview"
            chevron={false}
            divider={false}
            onPress={() => {
              resetDemo();
              toast.show('Demo reset — reload to see the starting trips', 'info');
            }}
          />
        </Surface>
      ) : (
        <Surface level="card" style={styles.block}>
          <ListRow icon={LogOut} title="Log out" destructive chevron={false} divider={false} onPress={() => void signOut()} />
        </Surface>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background.primary },
  content: { padding: gutter, paddingBottom: space.xl },
  block: { marginBottom: space.mdl },
  badge: { marginBottom: space.mdl },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileText: { flex: 1, marginHorizontal: 13 },
  guestActions: { gap: space.sm },
  previewNote: { marginTop: -space.smd, marginBottom: space.mdl },
});

import { useRouter } from 'expo-router';
import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, radius, spacing } from '../../../src/theme/tokens';
import { useAuthStore } from '../../../src/store/authStore';

function NavRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.gold} />
      <AppText variant="body" style={{ flex: 1, marginLeft: spacing.md }}>
        {label}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  if (status !== 'signed-in') {
    return (
      <ScreenContainer>
        <AppText variant="display" style={{ marginBottom: spacing.lg }}>
          Account
        </AppText>

        <Card style={{ alignItems: 'center', padding: spacing.xl, marginBottom: spacing.lg }}>
          <Ionicons name="person-circle-outline" size={40} color={colors.gold} style={{ marginBottom: spacing.sm }} />
          <AppText variant="subheading" center style={{ marginBottom: spacing.xs }}>
            You&apos;re browsing as a guest
          </AppText>
          <AppText variant="bodyMuted" center style={{ marginBottom: spacing.lg }}>
            Sign in or create a free account to save payment methods, view trip history, and manage your profile.
          </AppText>
          <Button label="Sign In" onPress={() => router.push('/(auth)/login')} style={{ width: '100%', marginBottom: spacing.sm }} />
          <Button label="Create Account" variant="secondary" onPress={() => router.push('/(auth)/signup')} style={{ width: '100%' }} />
        </Card>

        <View style={{ gap: spacing.sm }}>
          <NavRow icon="business-outline" label="About LCT Universal" onPress={() => router.push('/(app)/about')} />
          <NavRow icon="briefcase-outline" label="Corporate Accounts" onPress={() => router.push('/(app)/corporate-info')} />
          <NavRow icon="navigate-outline" label="Preview Live Tracking" onPress={() => router.push('/(app)/demo-trip')} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppText variant="display" style={{ marginBottom: spacing.lg }}>
        Account
      </AppText>

      <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={22} color={colors.gold} />
          </View>
        )}
        <View style={{ marginLeft: spacing.md, flex: 1 }}>
          <AppText variant="subheading">{profile?.full_name ?? '—'}</AppText>
          <AppText variant="bodyMuted">{profile?.email ?? '—'}</AppText>
          {profile?.phone ? <AppText variant="bodyMuted">{profile.phone}</AppText> : null}
        </View>
      </Card>

      <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
        <NavRow icon="person-circle-outline" label="Edit Profile" onPress={() => router.push('/(app)/account/edit-profile')} />
        <NavRow icon="people-outline" label="Saved Passengers" onPress={() => router.push('/(app)/account/saved-passengers')} />
        <NavRow icon="location-outline" label="Saved Locations" onPress={() => router.push('/(app)/account/saved-locations')} />
        <NavRow icon="card-outline" label="Payment Methods" onPress={() => router.push('/(app)/account/payment-methods')} />
        <NavRow icon="time-outline" label="Trip History" onPress={() => router.push('/(app)/trips')} />
        <NavRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/(app)/account/notifications')} />
        {profile?.corporate_account_id ? (
          <NavRow icon="business-outline" label="Corporate Account" onPress={() => router.push('/(app)/account/corporate')} />
        ) : (
          <NavRow icon="briefcase-outline" label="Corporate Solutions" onPress={() => router.push('/(app)/corporate-info')} />
        )}
        <NavRow icon="information-circle-outline" label="About LCT Universal" onPress={() => router.push('/(app)/about')} />
        <NavRow icon="settings-outline" label="Settings" onPress={() => router.push('/(app)/account/settings')} />
      </View>

      <Pressable onPress={() => void signOut()} style={styles.row}>
        <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        <AppText variant="body" color={colors.destructive} style={{ marginLeft: spacing.md }}>
          Log Out
        </AppText>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = {
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.onyx,
  },
  avatar: { width: 52, height: 52, borderRadius: radius.full },
  avatarPlaceholder: { backgroundColor: colors.charcoal, alignItems: 'center' as const, justifyContent: 'center' as const },
};

import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <ScreenContainer>
      <AppText variant="display" style={{ marginBottom: spacing.lg }}>
        Account
      </AppText>

      <Card style={{ marginBottom: spacing.lg }}>
        <AppText variant="subheading">{profile?.full_name ?? '—'}</AppText>
        <AppText variant="bodyMuted">{profile?.email ?? '—'}</AppText>
        {profile?.phone ? <AppText variant="bodyMuted">{profile.phone}</AppText> : null}
      </Card>

      <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
        <NavRow icon="person-circle-outline" label="Edit Profile" onPress={() => router.push('/(app)/account/edit-profile')} />
        <NavRow icon="people-outline" label="Saved Passengers" onPress={() => router.push('/(app)/account/saved-passengers')} />
        <NavRow icon="location-outline" label="Saved Locations" onPress={() => router.push('/(app)/account/saved-locations')} />
        <NavRow icon="card-outline" label="Payment Methods" onPress={() => router.push('/(app)/account/payment-methods')} />
        <NavRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/(app)/account/notifications')} />
        {profile?.corporate_account_id ? (
          <NavRow icon="business-outline" label="Corporate Account" onPress={() => router.push('/(app)/account/corporate')} />
        ) : null}
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
};

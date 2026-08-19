import { useRouter } from 'expo-router';
import { Image, Pressable, View } from 'react-native';
import {
  ChevronRight,
  UserCircle,
  Building2,
  Briefcase,
  Navigation,
  User,
  Users,
  MapPin,
  CreditCard,
  Clock,
  Bell,
  Info,
  Settings,
  LogOut,
  type LucideIcon,
} from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, radius, spacing } from '../../../src/theme/tokens';
import { useAuthStore } from '../../../src/store/authStore';

function NavRow({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Icon size={20} color={colors.gold} strokeWidth={1.5} />
      <AppText variant="body" style={{ flex: 1, marginLeft: spacing.md }}>
        {label}
      </AppText>
      <ChevronRight size={18} color={colors.mutedForeground} strokeWidth={1.5} />
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
          <UserCircle size={40} color={colors.gold} strokeWidth={1.5} style={{ marginBottom: spacing.sm }} />
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
          <NavRow icon={Building2} label="About LCT Universal" onPress={() => router.push('/(app)/about')} />
          <NavRow icon={Briefcase} label="Corporate Accounts" onPress={() => router.push('/(app)/corporate-info')} />
          <NavRow icon={Navigation} label="Preview Live Tracking" onPress={() => router.push('/(app)/demo-trip')} />
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
            <User size={22} color={colors.gold} strokeWidth={1.5} />
          </View>
        )}
        <View style={{ marginLeft: spacing.md, flex: 1 }}>
          <AppText variant="subheading">{profile?.full_name ?? '—'}</AppText>
          <AppText variant="bodyMuted">{profile?.email ?? '—'}</AppText>
          {profile?.phone ? <AppText variant="bodyMuted">{profile.phone}</AppText> : null}
        </View>
      </Card>

      <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
        <NavRow icon={UserCircle} label="Edit Profile" onPress={() => router.push('/(app)/account/edit-profile')} />
        <NavRow icon={Users} label="Saved Passengers" onPress={() => router.push('/(app)/account/saved-passengers')} />
        <NavRow icon={MapPin} label="Saved Locations" onPress={() => router.push('/(app)/account/saved-locations')} />
        <NavRow icon={CreditCard} label="Payment Methods" onPress={() => router.push('/(app)/account/payment-methods')} />
        <NavRow icon={Clock} label="Trip History" onPress={() => router.push('/(app)/trips')} />
        <NavRow icon={Bell} label="Notifications" onPress={() => router.push('/(app)/account/notifications')} />
        {profile?.corporate_account_id ? (
          <NavRow icon={Building2} label="Corporate Account" onPress={() => router.push('/(app)/account/corporate')} />
        ) : (
          <NavRow icon={Briefcase} label="Corporate Solutions" onPress={() => router.push('/(app)/corporate-info')} />
        )}
        <NavRow icon={Info} label="About LCT Universal" onPress={() => router.push('/(app)/about')} />
        <NavRow icon={Settings} label="Settings" onPress={() => router.push('/(app)/account/settings')} />
      </View>

      <Pressable onPress={() => void signOut()} style={styles.row}>
        <LogOut size={20} color={colors.destructive} strokeWidth={1.5} />
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

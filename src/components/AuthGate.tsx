import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { AppText } from './ui/Typography';
import { colors, spacing } from '../theme/tokens';
import { useAuthStore } from '../store/authStore';

interface Props {
  /** Shown as the card headline, e.g. "Create an account to complete your booking". */
  title: string;
  message?: string;
  children: ReactNode;
}

/**
 * Guards a specific action (booking confirmation, saving a payment method,
 * viewing trip history) behind a real account — guests get the full app
 * shell (see (app)/_layout.tsx), but these particular actions genuinely
 * need a Supabase-authenticated user (they write/read data scoped to a
 * profile). Renders `children` once signed in; otherwise a clear,
 * on-brand prompt with a path to Sign In or Create Account, never a dead
 * end or a raw permissions error.
 */
export function AuthGate({ title, message, children }: Props) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  if (status === 'signed-in') return <>{children}</>;

  return (
    <Card style={{ alignItems: 'center', padding: spacing.xl }}>
      <Ionicons name="lock-closed-outline" size={26} color={colors.gold} style={{ marginBottom: spacing.sm }} />
      <AppText variant="subheading" center style={{ marginBottom: spacing.xs }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="bodyMuted" center style={{ marginBottom: spacing.lg }}>
          {message}
        </AppText>
      ) : (
        <View style={{ marginBottom: spacing.lg }} />
      )}
      <Button label="Sign In" onPress={() => router.push('/(auth)/login')} style={{ width: '100%', marginBottom: spacing.sm }} />
      <Button label="Create Account" variant="secondary" onPress={() => router.push('/(auth)/signup')} style={{ width: '100%' }} />
    </Card>
  );
}

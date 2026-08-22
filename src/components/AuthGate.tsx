import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { AppText } from './ui/Typography';
import { space, theme } from '../theme';
import { useAuthStore } from '../store/authStore';

interface Props {
  /** Shown as the card headline, e.g. "Create an account to complete your booking". */
  title: string;
  message?: string;
  children: ReactNode;
  /** When provided, shows a third "Continue Later" action beneath Sign In / Create Account. */
  onContinueLater?: () => void;
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
export function AuthGate({ title, message, children, onContinueLater }: Props) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  if (status === 'signed-in') return <>{children}</>;

  return (
    <Card style={{ alignItems: 'center', padding: space.xl }}>
      <Lock size={26} color={theme.content.accent} strokeWidth={1.5} style={{ marginBottom: space.sm }} />
      <AppText variant="subheading" center style={{ marginBottom: space.xs }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="bodyMuted" center style={{ marginBottom: space.lg }}>
          {message}
        </AppText>
      ) : (
        <View style={{ marginBottom: space.lg }} />
      )}
      <Button label="Sign In" onPress={() => router.push('/(auth)/login')} style={{ width: '100%', marginBottom: space.sm }} />
      <Button
        label="Create Account"
        variant="secondary"
        onPress={() => router.push('/(auth)/signup')}
        style={{ width: '100%', marginBottom: onContinueLater ? space.sm : 0 }}
      />
      {onContinueLater ? <Button label="Continue Later" variant="ghost" onPress={onContinueLater} style={{ width: '100%' }} /> : null}
    </Card>
  );
}

import { useState } from 'react';
import { Link } from 'expo-router';
import { View } from 'react-native';
import { AuthBrandHeader } from '../../src/components/AuthBrandHeader';
import { Button } from '../../src/components/ui/Button';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { TextField } from '../../src/components/ui/TextField';
import { AppText } from '../../src/components/ui/Typography';
import { colors, spacing } from '../../src/theme/tokens';
import { supabase } from '../../src/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const configured = Boolean(supabase);

  async function handleReset() {
    if (!supabase || !email.trim()) {
      setError('Enter the email you signed up with.');
      return;
    }
    setLoading(true);
    setError(null);
    // redirectTo uses the app's custom scheme (see app.config.ts `scheme`)
    // so the reset link deep-links back into the app.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'lctuniversal://reset-password',
    });
    setLoading(false);
    if (resetError) setError(resetError.message);
    else setSent(true);
  }

  return (
    <ScreenContainer>
      <AuthBrandHeader
        eyebrow="Account Recovery"
        title="Reset Password"
        subtitle="We'll email you a link to set a new password."
      />

      {!configured ? (
        <AppText variant="bodyMuted" center style={{ marginBottom: spacing.md }}>
          Password reset isn&apos;t configured on this build yet — see .env.example.
        </AppText>
      ) : sent ? (
        <AppText variant="body" center style={{ marginBottom: spacing.md }}>
          If an account exists for {email.trim()}, a reset link is on its way.
        </AppText>
      ) : (
        <>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          {error ? (
            <AppText variant="caption" color={colors.destructive} style={{ marginBottom: spacing.md }}>
              {error}
            </AppText>
          ) : null}
          <Button label="Send Reset Link" onPress={handleReset} loading={loading} />
        </>
      )}

      <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
        <Link href="/(auth)/login">
          <AppText variant="body" color={colors.gold}>
            Back to Sign In
          </AppText>
        </Link>
      </View>
    </ScreenContainer>
  );
}

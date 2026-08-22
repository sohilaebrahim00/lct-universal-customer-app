import { useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
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
    if (!supabase) {
      setError('This preview build has no backend connected — password reset is a UI-only demo here.');
      return;
    }
    if (!email.trim()) {
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

      {/* Non-blocking: informational only — the field and button below stay fully interactive either way. */}
      {!configured ? (
        <AppText variant="bodyMuted" center style={{ marginBottom: spacing.md }}>
          Preview mode: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY aren&apos;t set on this build, so
          this can&apos;t reach a real backend yet — you can still explore the UI below.
        </AppText>
      ) : null}

      {sent ? (
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
            <AppText variant="caption" color={colors.destructiveText} accessibilityLiveRegion="assertive" style={{ marginBottom: spacing.md }}>
              {error}
            </AppText>
          ) : null}
          <Button label="Send Reset Link" onPress={handleReset} loading={loading} />
        </>
      )}

      <View style={styles.row}>
        <Link href="/(auth)/login" asChild>
          <Pressable accessibilityRole="link" accessible style={styles.link} hitSlop={8}>
            <AppText variant="body" color={colors.gold}>
              Back to Sign In
            </AppText>
          </Pressable>
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { marginTop: spacing.xl, alignItems: 'center' },
  /** 44 tall. A bare <Link> around text is a ~16pt target. */
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
});

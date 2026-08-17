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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = Boolean(supabase);

  async function handleLogin() {
    if (!supabase) {
      setError('This preview build has no backend connected — sign-in is a UI-only demo here.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInError) setError(signInError.message);
    // On success, the auth store's onAuthStateChange listener updates
    // status, and app/index.tsx redirects into (app) automatically.
  }

  return (
    <ScreenContainer>
      <AuthBrandHeader
        eyebrow="Executive Transportation"
        title="Welcome Back"
        subtitle="Sign in to book, track, and manage your rides."
      />

      {/*
        Non-blocking: informational only. Inputs and the button below stay
        fully interactive either way — signing in for real just isn't
        possible until Supabase is configured, which handleLogin's own
        guard reports clearly instead of silently doing nothing.
      */}
      {!configured ? (
        <AppText variant="bodyMuted" center style={{ marginBottom: spacing.md }}>
          Preview mode: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY aren&apos;t set on this build, so
          sign-in can&apos;t reach a real backend yet — you can still explore the UI below.
        </AppText>
      ) : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
      />

      {error ? (
        <AppText variant="caption" color={colors.destructive} style={{ marginBottom: spacing.md }}>
          {error}
        </AppText>
      ) : null}

      <Button label="Sign In" onPress={handleLogin} loading={loading} />

      <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
        <Link href="/(auth)/forgot-password">
          <AppText variant="caption" color={colors.gold}>
            Forgot password?
          </AppText>
        </Link>
      </View>

      <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
        <AppText variant="bodyMuted">
          New to LCT Universal?{' '}
          <Link href="/(auth)/signup">
            <AppText variant="body" color={colors.gold}>
              Create an account
            </AppText>
          </Link>
        </AppText>
      </View>
    </ScreenContainer>
  );
}

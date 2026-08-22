import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { AuthBrandHeader } from '../../src/components/AuthBrandHeader';
import { SocialAuthButtons } from '../../src/components/SocialAuthButtons';
import { Button } from '../../src/components/ui/Button';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { TextField } from '../../src/components/ui/TextField';
import { AppText } from '../../src/components/ui/Typography';
import { colors, spacing } from '../../src/theme/tokens';
import { supabase } from '../../src/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
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
        <AppText variant="caption" color={colors.destructiveText} accessibilityLiveRegion="assertive" style={{ marginBottom: spacing.md }}>
          {error}
        </AppText>
      ) : null}

      <Button label="Sign In" onPress={handleLogin} loading={loading} />

      <Button
        label="Try Demo Experience"
        variant="ghost"
        onPress={() => router.push('/demo-account')}
        style={{ marginTop: spacing.sm }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: -spacing.xs }}>
        <Sparkles size={12} color={colors.mutedForeground} strokeWidth={1.5} />
        <AppText variant="caption" style={{ marginLeft: 4 }}>
          Preview the app with sample data — no account needed
        </AppText>
      </View>

      <SocialAuthButtons />

      {/*
        44pt, not the ~16pt a bare <Link> around caption text gives you.
        "Forgot password?" is the control a locked-out customer needs most and
        was the smallest target on the screen.
      */}
      <View style={styles.linkRow}>
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable accessibilityRole="link" style={styles.link} hitSlop={8}>
            <AppText variant="caption" color={colors.gold}>
              Forgot password?
            </AppText>
          </Pressable>
        </Link>
      </View>

      <View style={styles.signupRow}>
        <AppText variant="bodyMuted">New to LCT Universal?</AppText>
        <Link href="/(auth)/signup" asChild>
          <Pressable accessibilityRole="link" style={styles.link} hitSlop={8}>
            <AppText variant="body" color={colors.gold}>
              Create an account
            </AppText>
          </Pressable>
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  linkRow: { marginTop: spacing.md, alignItems: 'center' },
  signupRow: { marginTop: spacing.xl, alignItems: 'center' },
  /** The row grows to a real target; the type stays where it was. */
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
});

import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { View } from 'react-native';
import { AuthBrandHeader } from '../../src/components/AuthBrandHeader';
import { SocialAuthButtons } from '../../src/components/SocialAuthButtons';
import { Button } from '../../src/components/ui/Button';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { TextField } from '../../src/components/ui/TextField';
import { AppText } from '../../src/components/ui/Typography';
import { colors, spacing } from '../../src/theme/tokens';
import { supabase } from '../../src/lib/supabase';

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const configured = Boolean(supabase);

  async function handleSignup() {
    if (!supabase) {
      setError('This preview build has no backend connected — sign-up is a UI-only demo here.');
      return;
    }
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Full name, email, and password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), phone: phone.trim() || undefined } },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (!data.session) {
      // Email confirmation is required by this Supabase project's auth
      // settings — no session yet, so app/index.tsx won't redirect until
      // the user confirms and signs in.
      setAwaitingConfirmation(true);
    }
  }

  if (awaitingConfirmation) {
    return (
      <ScreenContainer>
        <AuthBrandHeader eyebrow="Almost there" title="Check Your Email" subtitle="" />
        <AppText variant="body" center>
          We sent a confirmation link to {email.trim()}. Confirm your email, then sign in.
        </AppText>
        <View style={{ marginTop: spacing.xl }}>
          <Button label="Back to Sign In" onPress={() => router.replace('/(auth)/login')} variant="secondary" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AuthBrandHeader
        eyebrow="Executive Transportation"
        title="Create Account"
        subtitle="Book premium chauffeured transportation in minutes."
      />

      {/* Non-blocking: informational only — every field and the button below stay fully interactive either way. */}
      {!configured ? (
        <AppText variant="bodyMuted" center style={{ marginBottom: spacing.md }}>
          Preview mode: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY aren&apos;t set on this build, so
          sign-up can&apos;t reach a real backend yet — you can still explore the UI below.
        </AppText>
      ) : null}

      <TextField label="Full Name" value={fullName} onChangeText={setFullName} autoComplete="name" />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextField label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TextField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

      {error ? (
        <AppText variant="caption" color={colors.destructive} style={{ marginBottom: spacing.md }}>
          {error}
        </AppText>
      ) : null}

      <Button label="Create Account" onPress={handleSignup} loading={loading} />

      <SocialAuthButtons />

      <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
        <AppText variant="bodyMuted">
          Already have an account?{' '}
          <Link href="/(auth)/login">
            <AppText variant="body" color={colors.gold}>
              Sign in
            </AppText>
          </Link>
        </AppText>
      </View>
    </ScreenContainer>
  );
}

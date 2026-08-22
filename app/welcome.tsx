import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { Button } from '../src/components/ui/Button';
import { AppText } from '../src/components/ui/Typography';
import { FadeSlideIn } from '../src/components/ui/FadeSlideIn';
import { colors, spacing } from '../src/theme/tokens';
import { useAuthStore } from '../src/store/authStore';

export default function WelcomeScreen() {
  const router = useRouter();
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const [entering, setEntering] = useState(false);

  async function handleGuest() {
    setEntering(true);
    await continueAsGuest();
    router.replace('/(app)');
  }

  return (
    <View style={styles.container}>
      <Image source={require('../assets/onboarding/book.jpg')} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />

      <View style={styles.content}>
        <FadeSlideIn>
          <Image
            source={require('../assets/brand/lct-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="LCT Universal Executive Transportation"
          />
        </FadeSlideIn>

        <FadeSlideIn delay={100}>
          <AppText variant="eyebrow" center>
            LCT Universal
          </AppText>
          <AppText variant="display" center style={styles.headline}>
            Executive Transportation Redefined
          </AppText>
          <AppText variant="bodyMuted" center style={styles.subhead}>
            Chauffeured sedans, SUVs and coaches across Dallas–Fort Worth, tracked in real time.
          </AppText>
        </FadeSlideIn>

        <FadeSlideIn delay={200} style={styles.actions}>
          <Button label="Continue as Guest" onPress={handleGuest} loading={entering} />
          <Button label="Sign In" variant="secondary" onPress={() => router.push('/(auth)/login')} />
          <Button label="Create Account" variant="ghost" onPress={() => router.push('/(auth)/signup')} />
        </FadeSlideIn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBlack },
  overlay: { backgroundColor: 'rgba(2,2,1,0.78)' },
  content: { flex: 1, justifyContent: 'flex-end', padding: spacing.xl, paddingBottom: spacing.xxl },
  logo: { width: 120, height: 82, alignSelf: 'center', marginBottom: spacing.xl },
  headline: { marginTop: spacing.sm, marginBottom: spacing.sm },
  subhead: { marginBottom: spacing.xl, maxWidth: 320, alignSelf: 'center' },
  actions: { gap: spacing.sm },
});

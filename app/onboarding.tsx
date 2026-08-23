import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui/Button';
import { AppText } from '../src/components/ui/Typography';
import { space, theme } from '../src/theme';
import { markOnboardingSeen } from '../src/lib/onboarding';

/**
 * ONBOARDING — one slide, per artboard 2a.
 *
 * ── Why the copy changed ────────────────────────────────────────────────────
 * The previous version led with "Book in Seconds" and "Executive
 * Transportation, On Demand". The app enforces a one-hour minimum lead time and
 * on-demand is unconfirmed with dispatch (`servicePolicy.onDemandEnabled` is
 * false), so both lines promised something the system actively refuses. The
 * first screen a customer sees is the worst place in the product to make a
 * promise that the second screen breaks.
 *
 * Replaced with the company's own language: "Reserve executive transportation
 * across Dallas–Fort Worth and Grapevine, Texas." Reserve, not book-in-seconds —
 * which is what LCT actually does, and what the flow actually supports.
 *
 * ── Why one slide ───────────────────────────────────────────────────────────
 * Three slides ran before the customer had any reason to care. The other two
 * are earned rather than asserted: the fleet lives in the Fleet screen, and
 * tracking is demonstrated from Trips. Value goes behind one Continue.
 *
 * The logo also appears here at the same size it appears everywhere else, which
 * ends the three-stage splash reveal (native splash → loading screen → welcome,
 * each at a different size).
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function handleContinue() {
    await markOnboardingSeen();
    router.replace('/welcome');
  }

  async function handleSignIn() {
    await markOnboardingSeen();
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.screen}>
      {/*
        The interior shot with the chauffeur — it says what the service is.
        The treatment is the design's: saturation pulled back and brightness
        down, so the photograph reads as a ground for type rather than
        competing with it.
      */}
      <Image
        source={require('../assets/onboarding/ride.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.desaturate} pointerEvents="none" />

      {/*
        React Native has no CSS filter, so `saturate(.75) brightness(.62)` is
        approximated: a low-opacity neutral wash flattens saturation, and the
        vertical scrim below carries the brightness reduction. Flagged as an
        approximation rather than presented as the filter.
      */}
      <LinearGradient
        colors={['rgba(2,2,1,0.55)', 'rgba(2,2,1,0.15)', 'rgba(2,2,1,0.92)', theme.background.primary]}
        locations={[0, 0.34, 0.78, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[styles.content, { paddingTop: insets.top + space.smd, paddingBottom: insets.bottom + space.xl }]}>
        <Image
          source={require('../assets/brand/lct-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="LCT Universal Executive Transports"
        />

        <View style={styles.copy}>
          <AppText variant="eyebrow" style={styles.eyebrow}>
            Est. Dallas–Fort Worth
          </AppText>

          <AppText variant="display" accessibilityRole="header" style={styles.headline}>
            A car, a chauffeur,{'\n'}and nothing else{'\n'}to think about.
          </AppText>

          <AppText variant="bodyLead" style={styles.body}>
            Reserve executive transportation across Dallas–Fort Worth and Grapevine, Texas.
          </AppText>

          <Button label="Continue" haptic onPress={() => void handleContinue()} />

          <Pressable
            onPress={() => void handleSignIn()}
            accessibilityRole="button"
            accessibilityLabel="Already a client? Sign in"
            style={styles.signIn}
          >
            <AppText variant="caption" center>
              Already a client?{' '}
              <AppText variant="caption" color={theme.content.accent}>
                Sign in
              </AppText>
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /*
   * `overflow: 'hidden'` is load-bearing on web, not tidiness.
   *
   * `ride.jpg` is 1400×2535. React Native Web renders `<Image>` as an element
   * that keeps the source's intrinsic width, and every ancestor here computes
   * `overflow-x: visible`, so the photograph leaked past its absolutely
   * positioned box and set the DOCUMENT's scrollWidth to 1400 against a 390
   * viewport. `body` clips, so there was no scrollbar to notice — but
   * `window.scrollTo(500, 0)` moved, which on a phone is the first screen a new
   * customer sees sliding sideways under their thumb.
   *
   * Native is unaffected: `absoluteFill` genuinely constrains there. This is a
   * web-only leak, which is why nothing caught it until the reflow gate was
   * pointed at the right URL.
   *
   * ── Why only this screen ────────────────────────────────────────────────
   * Every other full-bleed photograph goes through `AppImage`, whose frame
   * already sets `overflow: 'hidden'` — so `welcome.tsx`, on the same
   * `absoluteFill` pattern with the same kind of asset, never leaked. This is
   * the last raw `<Image>` used as a background, and it was therefore the only
   * one exposed. That is an argument for the wrapper existing, not for hunting
   * the next instance by hand.
   */
  screen: { flex: 1, backgroundColor: theme.background.primary, overflow: 'hidden' },
  /** Stands in for `saturate(.75)`; RN has no filter primitive. */
  desaturate: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(28,26,24,0.22)' },
  content: { flex: 1, paddingHorizontal: 26, justifyContent: 'space-between' },
  logo: { width: 104, height: 70 },
  copy: { paddingBottom: space.smd },
  eyebrow: { marginBottom: 14 },
  headline: { marginBottom: space.smd },
  body: { marginBottom: 26, maxWidth: 300 },
  signIn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: space.smd },
});

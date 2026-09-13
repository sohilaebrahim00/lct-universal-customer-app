import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui/Button';
import { AppImage } from '../src/components/ui/AppImage';
import { AppText } from '../src/components/ui/Typography';
import { gutter, radius, space, theme } from '../src/theme';
import { markOnboardingSeen } from '../src/lib/onboarding';
import { useAuthStore } from '../src/store/authStore';

/**
 * FIRST RUN — the intro, and the one screen a client sees before anything else.
 *
 * ── Why this had never been seen ──────────────────────────────────────────
 * It existed as a single slide and `app/index.tsx` checked `status ===
 * 'signed-in'` before it checked whether onboarding was needed. A demo build
 * auto-signs-in on launch, so the redirect fired first and the screen was
 * unreachable in the build that ships. The ordering is fixed there; this file
 * is the intro it now reaches.
 *
 * ── What the third slide does NOT say ─────────────────────────────────────
 * "Stay informed throughout your ride", not "track your chauffeur live".
 * There is no live driver location: `Trip.driver_current_lat/lng` exist in the
 * contract and no backend writes them, and the web build has no map at all.
 * A promise of live tracking on the first screen a customer reads would be
 * contradicted three taps later, which is the one thing an intro must not do.
 *
 * ── Persistence is device-local, and only claims to be ────────────────────
 * `markOnboardingSeen()` writes one AsyncStorage key. It is not synced to an
 * account and nothing here suggests it is: the same person on a second device
 * sees the intro again, which is correct rather than a bug.
 */

const SLIDES = [
  {
    key: 'confidence',
    image: require('../assets/onboarding/ride.jpg'),
    headline: 'Ride with confidence.',
    copy: 'Professional transportation for business, airport and private travel.',
  },
  {
    key: 'booking',
    image: require('../assets/onboarding/book.jpg'),
    headline: 'Book in just a few taps.',
    copy: 'Choose your ride, schedule your pickup and manage your journey in one place.',
  },
  {
    key: 'informed',
    image: require('../assets/onboarding/track.jpg'),
    headline: 'Stay informed throughout your ride.',
    // Deliberately "when available" — see the note above.
    copy: 'View your chauffeur, trip status and journey details when available.',
  },
  {
    key: 'ready',
    image: require('../assets/home/hero.jpg'),
    headline: 'Ready when you are.',
    copy: 'Sign in to keep your trips and saved places, or take a look around first.',
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  /*
   * Measured rather than assumed. `Dimensions.get('window').width` is the right
   * starting value but wrong after a web resize or a tablet rotation, and a
   * paging ScrollView whose page width disagrees with its container settles
   * between slides.
   */
  const [width, setWidth] = useState(() => Dimensions.get('window').width);

  const last = index === SLIDES.length - 1;

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== width) setWidth(w);
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1));
    if (next !== index) setIndex(next);
  }

  function goTo(i: number) {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  }

  /** Every exit from this screen records that it was seen. */
  async function leave(to: '/welcome' | '/(auth)/login' | 'guest') {
    await markOnboardingSeen();
    if (to === 'guest') {
      await continueAsGuest();
      router.replace('/(app)');
      return;
    }
    router.replace(to);
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/*
          SKIP is always reachable, on every slide, and is a real control with
          a label rather than a bare chevron — a first-run screen a customer
          cannot leave is the fastest way to lose one.
        */}
        <View style={styles.skipRow}>
          <Pressable
            onPress={() => void leave('/welcome')}
            accessibilityRole="button"
            accessibilityLabel="Skip the introduction"
            style={({ pressed }) => [styles.skip, pressed ? styles.pressed : null]}
          >
            <AppText variant="caption" color={theme.content.secondary}>
              Skip
            </AppText>
          </Pressable>
        </View>

        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onLayout={onLayout}
          style={styles.pager}
        >
          {SLIDES.map((slide, i) => (
            <View
              key={slide.key}
              style={[styles.slide, { width }]}
              accessible
              accessibilityLabel={`${slide.headline} ${slide.copy}. Slide ${i + 1} of ${SLIDES.length}.`}
            >
              {/*
                `contentFit="cover"` inside a reserved box: the image fills its
                frame at any width without the vehicle being stretched, and the
                box is reserved so nothing below it moves when the photo
                decodes.
              */}
              <AppImage source={slide.image} style={styles.image} contentFit="cover" aspectRatio={4 / 5} />
              <View style={styles.copyBlock}>
                <AppText variant="display" style={styles.headline}>
                  {slide.headline}
                </AppText>
                <AppText variant="bodyMuted" style={styles.copy}>
                  {slide.copy}
                </AppText>
              </View>
            </View>
          ))}
        </ScrollView>

        {/*
          THE DOTS ARE NOT THE ONLY WAY THROUGH.
          Each is a real 44px control with its own label, and the primary button
          advances as well — so the carousel is usable by keyboard on web and by
          anyone who cannot swipe.
        */}
        <View style={styles.dots} accessibilityRole="tablist">
          {SLIDES.map((slide, i) => (
            <Pressable
              key={slide.key}
              onPress={() => goTo(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected: i === index }}
              accessibilityLabel={`Go to slide ${i + 1} of ${SLIDES.length}`}
              style={styles.dotHit}
            >
              <View style={[styles.dot, i === index ? styles.dotActive : null]} />
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          {last ? (
            <>
              <Button label="Sign In" onPress={() => void leave('/(auth)/login')} haptic />
              <Button label="Continue as Guest" variant="secondary" onPress={() => void leave('guest')} />
            </>
          ) : (
            <Button label="Continue" onPress={() => goTo(index + 1)} haptic />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background.primary },
  safe: { flex: 1 },
  skipRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: gutter },
  /* 44 high and 44 wide: a real target, not a word in a corner. */
  skip: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  pager: { flex: 1 },
  slide: { paddingHorizontal: gutter, justifyContent: 'center' },
  image: { width: '100%', borderRadius: radius.lg, overflow: 'hidden' },
  copyBlock: { marginTop: space.xl },
  headline: { marginBottom: space.sm },
  copy: { maxWidth: 520 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.xs, paddingVertical: space.sm },
  dotHit: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: theme.background.skeleton },
  dotActive: { backgroundColor: theme.content.accent, width: 22 },
  actions: { paddingHorizontal: gutter, paddingBottom: space.md, gap: space.sm },
});

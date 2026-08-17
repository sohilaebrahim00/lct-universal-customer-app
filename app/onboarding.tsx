import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Dimensions, Image, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { Button } from '../src/components/ui/Button';
import { AppText } from '../src/components/ui/Typography';
import { colors, radius, spacing } from '../src/theme/tokens';
import { markOnboardingSeen } from '../src/lib/onboarding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    image: require('../assets/onboarding/book.jpg'),
    eyebrow: 'Book in Seconds',
    title: 'Executive Transportation, On Demand',
    subtitle: 'Airport transfers, corporate travel, and events — book a professional chauffeur in a few taps.',
  },
  {
    image: require('../assets/onboarding/track.jpg'),
    eyebrow: 'Live Tracking',
    title: 'Watch Your Ride Approach',
    subtitle: 'Follow your chauffeur in real time, from confirmation to arrival, every step of the way.',
  },
  {
    image: require('../assets/onboarding/ride.jpg'),
    eyebrow: 'Ride in Comfort',
    title: 'A Premium Experience, Every Time',
    subtitle: 'Executive sedans, luxury SUVs, and coaches — every class includes a professional chauffeur.',
  },
];

function Dot({ index, scrollX }: { index: number; scrollX: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const distance = Math.abs(scrollX.value / SCREEN_WIDTH - index);
    const active = distance < 0.5;
    return {
      width: withTiming(active ? 22 : 8, { duration: 200 }),
      opacity: withTiming(active ? 1 : 0.4, { duration: 200 }),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [page, setPage] = useState(0);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = event.nativeEvent.contentOffset.x;
    scrollX.value = x;
    setPage(Math.round(x / SCREEN_WIDTH));
  }

  async function handleDone() {
    await markOnboardingSeen();
    router.replace('/welcome');
  }

  function handleNext() {
    if (page < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * SCREEN_WIDTH, animated: true });
    } else {
      handleDone();
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={styles.slide}>
            <Image source={slide.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={[StyleSheet.absoluteFill, styles.overlay]} />
            <View style={styles.content}>
              <AppText variant="eyebrow">{slide.eyebrow}</AppText>
              <AppText variant="title" style={{ marginTop: spacing.xs, marginBottom: spacing.sm }}>
                {slide.title}
              </AppText>
              <AppText variant="bodyMuted">{slide.subtitle}</AppText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Dot key={i} index={i} scrollX={scrollX} />
          ))}
        </View>
        <View style={styles.actions}>
          <Button label="Skip" variant="ghost" onPress={handleDone} style={{ flex: 1 }} />
          <Button label={page === SLIDES.length - 1 ? 'Get Started' : 'Next'} onPress={handleNext} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBlack },
  slide: { width: SCREEN_WIDTH, flex: 1 },
  overlay: { backgroundColor: colors.overlay },
  content: { position: 'absolute', left: 0, right: 0, bottom: 220, paddingHorizontal: spacing.xl },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.xl, paddingTop: spacing.lg, backgroundColor: colors.surfaceBlack },
  dots: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg, justifyContent: 'center' },
  dot: { height: 8, borderRadius: radius.full, backgroundColor: colors.gold },
  actions: { flexDirection: 'row', gap: spacing.md },
});

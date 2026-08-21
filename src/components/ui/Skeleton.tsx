import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { choreography, radius, space, theme } from '../../theme';
import { useMotion } from '../../lib/useMotion';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

/** How wide the sweep is relative to the bar. Uber Base uses a 400% background-size. */
const SWEEP = 4;

interface BarProps {
  width?: DimensionValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Skeletons, not spinners.
 *
 * The app had five `ActivityIndicator`s and no skeletons, so every load was a
 * spinner on an empty screen and the layout popped in when it finished. A
 * skeleton resolves into the real thing instead.
 *
 * Rules encoded here:
 *  · Structural elements only. A skeleton on a small component reads as
 *    something you can interact with, which is worse than nothing.
 *  · The shape must mirror the real layout, which is why the presets below are
 *    named after what they stand in for rather than being generic boxes.
 *  · 1.5s linear sweep, matching Uber Base's shimmer exactly.
 *  · Under reduced motion the sweep does not run at all — a static bar is the
 *    correct degradation for a decorative infinite animation, not a slower one.
 *
 * The whole group is hidden from screen readers and announced once by its
 * container, so VoiceOver says "loading" rather than reading eight empty boxes.
 */
export function SkeletonBar({ width = '100%', height = 12, style }: BarProps) {
  const progress = useSharedValue(0);
  const motion = useMotion();
  const reduced = motion.reduced;

  useEffect(() => {
    if (reduced) return;
    progress.value = withRepeat(
      withTiming(1, { duration: choreography.shimmer, easing: Easing.linear }),
      -1,
      false,
    );
  }, [reduced, progress]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-SWEEP * 100, SWEEP * 100]) }],
  }));

  return (
    <View style={[styles.bar, { width, height }, style]}>
      {reduced ? null : (
        <AnimatedGradient
          colors={[theme.skeleton.base, theme.skeleton.shimmerHigh, theme.skeleton.base]}
          locations={[0, 0.4, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.sweep, sweepStyle]}
        />
      )}
    </View>
  );
}

/** A card-shaped placeholder: eyebrow, headline, meta. Mirrors a TripCard. */
export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonBar width={96} height={12} />
      <SkeletonBar width={180} height={20} style={styles.gapLg} />
      <SkeletonBar width={132} height={12} style={styles.gap} />
    </View>
  );
}

/** A run of card placeholders. `count` should match what the screen usually shows. */
export function SkeletonList({ count = 3, style }: { count?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={style}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      // One announcement for the group, not one per bar.
      accessibilityElementsHidden={false}
      importantForAccessibility="yes"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={i > 0 ? styles.gapCard : undefined} />
      ))}
    </View>
  );
}

export const Skeleton = { Bar: SkeletonBar, Card: SkeletonCard, List: SkeletonList };

const styles = StyleSheet.create({
  bar: {
    backgroundColor: theme.skeleton.base,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  sweep: { position: 'absolute', top: 0, bottom: 0, left: 0, width: `${SWEEP * 100}%` },
  card: {
    backgroundColor: theme.background.skeleton,
    borderWidth: 1,
    borderColor: theme.border.hairline,
    borderRadius: radius.lg,
    padding: 15,
  },
  gap: { marginTop: 9 },
  gapLg: { marginTop: space.smd },
  gapCard: { marginTop: 11 },
});

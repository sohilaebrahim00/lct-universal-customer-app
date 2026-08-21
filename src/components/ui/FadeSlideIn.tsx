import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { transition } from '../../theme';
import { useMotion } from '../../lib/useMotion';

/**
 * Which entrances have already played in this app session.
 *
 * Module scope on purpose: it must survive a screen unmounting and remounting
 * (a tab switch, a push and pop) and reset only on a cold start, which is
 * exactly the lifetime of a module in a JS bundle.
 */
const played = new Set<string>();

interface Props {
  children: ReactNode;
  delay?: number;
  /**
   * Identifies this entrance across mounts. Given one, the animation runs ONCE
   * per session and every later mount renders the content already in place.
   *
   * Without a key the entrance replays on every mount, which is what the old
   * component did unconditionally: returning to the Home tab re-staggered all
   * seven sections from zero, and an entrance that plays every time you come
   * back reads as slowness rather than polish (audit P1-4).
   */
  sessionKey?: string;
  style?: StyleProp<ViewStyle>;
}

export function FadeSlideIn({ children, delay = 0, sessionKey, style }: Props) {
  const motion = useMotion();

  // Decided once, at mount, before any animation is scheduled.
  const [skip] = useState(() => {
    if (sessionKey && played.has(sessionKey)) return true;
    if (sessionKey) played.add(sessionKey);
    return false;
  });

  const progress = useSharedValue(skip || motion.reduced ? 1 : 0);

  useEffect(() => {
    if (skip) return;
    if (motion.reduced) {
      // Reduced motion is replacement, not removal: the content still arrives,
      // it cross-fades in place instead of travelling.
      progress.value = withDelay(delay, withTiming(1, transition.reducedFade));
      return;
    }
    progress.value = withDelay(delay, withTiming(1, transition.enter));
  }, [skip, motion.reduced, delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    // No translation under reduced motion — opacity only.
    transform: motion.reduced ? [] : [{ translateY: (1 - progress.value) * 16 }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}

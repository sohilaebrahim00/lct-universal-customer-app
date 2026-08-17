import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

interface Props {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** Mount-triggered fade + slide-up entrance, used for staggered list/card reveals throughout the app. */
export function FadeSlideIn({ children, delay = 0, style }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 16 }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}

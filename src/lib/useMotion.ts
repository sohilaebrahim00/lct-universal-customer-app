import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/**
 * Reduced motion, treated as REPLACEMENT rather than removal.
 *
 * Reanimated's `ReduceMotion.System` makes `withTiming`/`withSpring` jump
 * straight to their target. That is correct and it is blunt: a card that
 * teleports into place is not what the setting asks for. On iOS,
 * `prefersCrossFadeTransitions()` says specifically that the user wants motion
 * REPLACED BY A CROSS-FADE — so `shouldCrossFade` below distinguishes "no
 * motion" from "fade instead of move", and callers degrade to a short opacity
 * fade in place.
 *
 * Two RN facts this hook exists to paper over, both verified against
 * react-native 0.86.2's own typings:
 *
 *  · `useReducedMotion()` samples once at app start. It does not track a user
 *    toggling the setting while the app is open, so the `reduceMotionChanged`
 *    subscription below is what keeps it live.
 *  · `prefersCrossFadeTransitions` is iOS-only; on Android and web it resolves
 *    false and the reduced-motion flag alone decides.
 */
export interface Motion {
  /** True when the user has asked for less motion by any signal. */
  reduced: boolean;
  /** True when the platform says the substitute should specifically be a cross-fade. */
  shouldCrossFade: boolean;
  /**
   * Convenience for the common branch: run `full` normally, `reduced` when the
   * user has asked for less. Keeps the ternary out of every component.
   */
  pick: <T>(full: T, reduced: T) => T;
}

export function useMotion(): Motion {
  // Reanimated's own read — correct at mount, stale afterwards.
  const initiallyReduced = useReducedMotion();
  const [reduced, setReduced] = useState(initiallyReduced);
  const [crossFade, setCrossFade] = useState(false);

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    });

    if (Platform.OS === 'ios') {
      void AccessibilityInfo.prefersCrossFadeTransitions().then((value) => {
        if (active) setCrossFade(value);
      });
    }

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      if (active) setReduced(value);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return {
    reduced,
    shouldCrossFade: reduced && crossFade,
    pick: (full, fallback) => (reduced ? fallback : full),
  };
}

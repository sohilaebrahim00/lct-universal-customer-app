import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from './Typography';
import { elevation, elevationRadius, radius, space, theme, transition } from '../../theme';
import { useMotion } from '../../lib/useMotion';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const OFFSCREEN = 420;
const DISMISS_DISTANCE = 120;
/** Material's fling threshold. Matched rather than invented so a flick feels like the platform. */
const DISMISS_VELOCITY = 500;

/**
 * An in-place modal sheet, for content that is not its own route.
 *
 * ── When NOT to use this ───────────────────────────────────────────────────
 * If the sheet IS a route — a picker you can navigate to and back from — use
 * `sheetScreenOptions()` in ./Sheet.tsx instead. That gets real OS detents, real
 * scrim behaviour and no JS on the drag, from `react-native-screens`, which is
 * already installed. This component exists for the cases that are not routes.
 *
 * ── Accessibility ─────────────────────────────────────────────────────────
 * `accessibilityViewIsModal` on iOS and `importantForAccessibility` on the
 * backdrop are what stop a screen reader from wandering into the content behind
 * an open sheet. RN's `Modal` handles focus containment on Android; iOS needs
 * to be told.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * Already the one component in the app that handled reduced motion correctly
 * before the redesign. It now goes through `useMotion()` like everything else,
 * so a reduced-motion user gets a cross-fade in place rather than either a slide
 * or a teleport.
 */
export function BottomSheet({ visible, onClose, title, children }: Props) {
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const translateY = useSharedValue(OFFSCREEN);
  const backdropOpacity = useSharedValue(0);

  // Modal's own `visible` toggles instantly, so this delays unmount until the
  // closing animation has actually finished instead of the sheet vanishing.
  const [rendered, setRendered] = useState(visible);
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setRendered(true);
  }

  useEffect(() => {
    const timing = motion.reduced ? transition.reducedFade : transition.enter;
    if (visible) {
      translateY.value = motion.reduced ? 0 : withTiming(0, timing);
      backdropOpacity.value = withTiming(1, timing);
    } else {
      translateY.value = motion.reduced ? OFFSCREEN : withTiming(OFFSCREEN, timing);
      backdropOpacity.value = withTiming(0, timing, (finished) => {
        if (finished) runOnJS(setRendered)(false);
      });
    }
  }, [visible, motion.reduced, translateY, backdropOpacity]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        // eslint-disable-next-line react-hooks/immutability -- worklet-owned cell, not render state
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      const shouldDismiss = e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY;
      if (shouldDismiss) {
        // eslint-disable-next-line react-hooks/immutability
        translateY.value = withTiming(OFFSCREEN, transition.exit, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        translateY.value = withTiming(0, transition.enter);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  if (!rendered) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
          importantForAccessibility="no-hide-descendants"
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
          pointerEvents="box-none"
        >
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }, sheetStyle]}
              accessibilityViewIsModal
            >
              <View style={styles.grabberHit}>
                <View style={styles.grabber} />
              </View>
              {title ? (
                <AppText variant="title" accessibilityRole="header" style={styles.title}>
                  {title}
                </AppText>
              ) : null}
              {children}
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  keyboard: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: theme.background.scrim },
  sheet: {
    ...elevation.sheet,
    maxHeight: '85%',
    borderTopLeftRadius: elevationRadius.sheet,
    borderTopRightRadius: elevationRadius.sheet,
    paddingHorizontal: space.mdl,
    paddingTop: space.sm,
  },
  // A 40x4 visual pill inside a 44pt target — the grab area is the row, not the pill.
  grabberHit: { height: 44, alignItems: 'center', justifyContent: 'center' },
  grabber: { width: 40, height: 4, borderRadius: radius.full, backgroundColor: theme.misc.handle },
  title: { marginBottom: space.md },
});

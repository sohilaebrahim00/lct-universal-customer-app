import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from './Typography';
import { colors, radius, spacing } from '../../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const OFFSCREEN = 420;
const DISMISS_THRESHOLD = 120;
const TIMING = { duration: 280, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };

/** Shared bottom sheet: backdrop fade, drag-to-dismiss handle, safe-area-aware panel. */
export function BottomSheet({ visible, onClose, title, children }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(OFFSCREEN);
  const backdropOpacity = useSharedValue(0);
  // Modal's own `visible` prop toggles instantly, so this delays the unmount until the closing
  // animation actually finishes instead of the sheet just vanishing.
  const [rendered, setRendered] = useState(visible);
  // Adjusting state during render (not in an effect) to mount as soon as `visible` flips true —
  // React's own documented pattern for deriving state from a prop change without an extra render pass.
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setRendered(true);
  }

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, TIMING);
      backdropOpacity.value = withTiming(1, TIMING);
    } else {
      translateY.value = withTiming(OFFSCREEN, TIMING);
      backdropOpacity.value = withTiming(0, TIMING, (finished) => {
        if (finished) runOnJS(setRendered)(false);
      });
    }
  }, [visible, translateY, backdropOpacity]);

  // Shared-value mutation inside gesture worklets — the same intentional Reanimated pattern
  // (and the same lint disable) as Button.tsx's press-scale handlers.
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        // eslint-disable-next-line react-hooks/immutability
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD) {
        // eslint-disable-next-line react-hooks/immutability
        translateY.value = withTiming(OFFSCREEN, { ...TIMING, duration: 220 }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        translateY.value = withTiming(0, { ...TIMING, duration: 220 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  if (!rendered) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.flexFill}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }, sheetStyle]}>
            <View style={styles.handle} />
            {title ? (
              <AppText variant="heading" style={styles.title}>
                {title}
              </AppText>
            ) : null}
            {children}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  backdrop: { backgroundColor: colors.overlay },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '85%',
    backgroundColor: colors.onyx,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  title: { marginBottom: spacing.md },
});

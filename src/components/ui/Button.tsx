import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './Typography';
import { controlHeight, elevation, iconSize, iconStroke, radius, space, spring, theme } from '../../theme';
import { useMotion } from '../../lib/useMotion';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  /** Rendered before the label. */
  iconLeading?: LucideIcon;
  /** Rendered after the label. */
  iconTrailing?: LucideIcon;
  /**
   * Why the button is disabled, e.g. "Pick a vehicle". Replaces the label while
   * disabled and becomes the accessibility hint — a dead control that says why
   * is a different experience from one that just sits there.
   */
  disabledReason?: string;
  /** Fires selection feedback on press. Off for navigation, on for commits and choices. */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const HEIGHT: Record<ButtonSize, number> = {
  sm: controlHeight.sm,
  md: controlHeight.md,
  lg: controlHeight.lg,
};

/**
 * The primary action.
 *
 * ── The five states, and why each is what it is ─────────────────────────────
 *
 * REST      Primary is the only filled thing on a screen. Secondary, ghost and
 *           danger are outlined — Classical's rule, and the reason gold reads as
 *           "the action" rather than as decoration.
 *
 * PRESSED   Springs to 0.97 AND swaps the gradient one stop darker. Scale alone
 *           is not enough feedback on a 52pt target; the fill change is what the
 *           thumb actually sees, since the thumb is covering the button.
 *
 * FOCUSED   A 2px gold ring, inset by 3. Required for the web preview and for
 *           external keyboards, and previously absent entirely (audit P1-3) —
 *           there was no way to see which control had focus. Drawn as an
 *           absolutely-positioned sibling rather than a border so it costs no
 *           layout and cannot shift the label.
 *
 * DISABLED  A flat fill and a legible label — never `opacity` on the whole
 *           control. The old `opacity: 0.45` put the composited label under
 *           4.5:1, so a disabled button was not merely dim, it was unreadable.
 *           `accessibilityState.disabled` is set, which it never was, so a
 *           screen reader stops announcing dead controls as available.
 *
 * LOADING   Keeps the label AND the button's intrinsic width, with a spinner to
 *           its left. Replacing the label with a spinner — the old behaviour —
 *           drops the accessible name in the middle of the action and makes the
 *           button change width as it starts.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  iconLeading: IconLeading,
  iconTrailing: IconTrailing,
  disabledReason,
  haptic = false,
  style,
  accessibilityHint,
  testID,
}: Props) {
  const isDisabled = Boolean(disabled) && !loading;
  const isInert = isDisabled || Boolean(loading);
  const motion = useMotion();

  const scale = useSharedValue(1);
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePressIn() {
    setIsPressed(true);
    if (!motion.reduced) {
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are worklet-owned cells, not render state.
      scale.value = withSpring(0.97, spring.press);
    }
  }

  function handlePressOut() {
    setIsPressed(false);
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(1, spring.release);
  }

  function handlePress() {
    // Selection is the browsing-grade signal: a choice was registered. Commits
    // and confirmations use notificationAsync at their own call site instead.
    if (haptic) void Haptics.selectionAsync();
    onPress();
  }

  const shownLabel = isDisabled && disabledReason ? disabledReason : label;
  const labelColor = isDisabled ? theme.content.disabled : LABEL_COLOR[variant];
  const glyphSize = size === 'sm' ? iconSize.sm : iconSize.md;

  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={labelColor}
          style={styles.spinner}
          // The label carries the accessible name; the spinner must not add a second one.
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : IconLeading ? (
        <IconLeading size={glyphSize} color={labelColor} strokeWidth={iconStroke.interactive} style={styles.leadingIcon} />
      ) : null}

      <AppText variant="label" color={labelColor} numberOfLines={1}>
        {shownLabel}
      </AppText>

      {IconTrailing && !loading ? (
        <IconTrailing size={glyphSize} color={labelColor} strokeWidth={iconStroke.interactive} style={styles.trailingIcon} />
      ) : null}
    </View>
  );

  const isFilled = variant === 'primary' && !isDisabled;

  return (
    <AnimatedPressable
      testID={testID}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      disabled={isInert}
      accessibilityRole="button"
      accessibilityLabel={shownLabel}
      accessibilityHint={accessibilityHint ?? (isDisabled ? disabledReason : undefined)}
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      style={[
        styles.base,
        { minHeight: HEIGHT[size] },
        isDisabled ? styles.disabled : VARIANT[variant],
        isFilled ? elevation.accent : null,
        animatedStyle,
        style,
      ]}
    >
      {isFilled ? (
        <LinearGradient
          colors={isPressed ? theme.accent.gradientPressed : theme.accent.gradient}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          {/* The 1px lit edge inside the gradient — the same specular trick as Surface. */}
          <View style={styles.specular} pointerEvents="none" />
        </LinearGradient>
      ) : null}

      {content}

      {isFocused && !isInert ? <View style={styles.focusRing} pointerEvents="none" /> : null}
    </AnimatedPressable>
  );
}

const VARIANT = StyleSheet.create({
  primary: {},
  secondary: { borderWidth: 1, borderColor: theme.border.outline, backgroundColor: 'transparent' },
  ghost: { borderWidth: 1, borderColor: theme.border.outline, backgroundColor: 'transparent' },
  danger: { borderWidth: 1, borderColor: theme.border.dangerTint, backgroundColor: 'transparent' },
});

const LABEL_COLOR: Record<ButtonVariant, string> = {
  primary: theme.content.onAccent,
  secondary: theme.content.accentSoft,
  ghost: theme.content.accentSoft,
  danger: theme.content.danger,
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    overflow: 'visible',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  spinner: { marginEnd: space.sm },
  leadingIcon: { marginEnd: space.sm },
  trailingIcon: { marginStart: space.sm },
  specular: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: theme.accent.specular },
  disabled: {
    backgroundColor: theme.background.disabled,
    borderWidth: 1,
    borderColor: theme.border.hairline,
  },
  focusRing: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    left: -3,
    right: -3,
    borderRadius: radius.md + 3,
    borderWidth: 2,
    borderColor: theme.border.focus,
  },
});

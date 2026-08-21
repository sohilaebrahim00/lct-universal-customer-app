import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { controlHeight, iconSize, iconStroke, minTouchTarget, radius, theme } from '../../theme';

export type IconButtonVariant = 'plain' | 'outlined' | 'overlay' | 'circular';

interface Props {
  icon: LucideIcon;
  onPress: () => void;
  /** REQUIRED. An icon-only control with no label is an unnamed button to a screen reader. */
  accessibilityLabel: string;
  accessibilityHint?: string;
  variant?: IconButtonVariant;
  size?: number;
  color?: string;
  disabled?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Every icon-only control in the app.
 *
 * Two things it exists to make impossible:
 *
 *  1. An unnamed button. `accessibilityLabel` is required, not optional. The app
 *     previously had 3 accessibility labels total across 31 pressables, and the
 *     destructive Trash2 controls beside a saved card were bare `Pressable`s
 *     wrapping a 20pt icon — an unnamed button one tap from deleting a card.
 *  2. A target under 44pt. `minWidth`/`minHeight` are hard-set here rather than
 *     left to whatever the icon happens to measure. `hitSlop` is not used as a
 *     substitute: it extends the touch region but does NOT change the frame a
 *     screen reader reports, so it cannot rescue an important control.
 */
export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  variant = 'plain',
  size = iconSize.md,
  color,
  disabled,
  selected,
  style,
  testID,
}: Props) {
  const glyphColor = disabled
    ? theme.content.disabled
    : (color ?? (selected ? theme.content.accent : theme.content.accentSoft));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(selected) }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        VARIANT[variant],
        selected ? styles.selected : null,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <Icon size={size} color={glyphColor} strokeWidth={iconStroke.interactive} />
    </Pressable>
  );
}

const VARIANT = StyleSheet.create({
  plain: {},
  outlined: {
    borderWidth: 1,
    borderColor: theme.border.outline,
    borderRadius: radius.md,
  },
  /** The circular control used for "back" on booking steps and account screens. */
  circular: {
    width: controlHeight.backButton,
    height: controlHeight.backButton,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: theme.border.hairline,
    backgroundColor: theme.background.secondary,
  },
  /**
   * Floating over a map or photograph. Opaque rather than blurred: `expo-blur`
   * is approved only conditionally, pending an Android release-build frame-cost
   * measurement that cannot be run in this environment. The fill is the same
   * value the blurred version would sit behind, so dropping BlurView in later is
   * additive.
   */
  overlay: {
    width: controlHeight.backButton,
    height: controlHeight.backButton,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: theme.border.hairline,
    backgroundColor: theme.background.tertiary,
  },
});

const styles = StyleSheet.create({
  base: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { borderColor: theme.border.selected },
  pressed: { opacity: 0.7 },
});

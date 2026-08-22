import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { hapticSelection } from '../../lib/haptics';
import { AppText } from './Typography';
import { IconButton } from './IconButton';
import { minTouchTarget, space, theme } from '../../theme';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Read out instead of the bare number, e.g. "3 guests". */
  unit?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Extracted from `book/details.tsx`, where it was an inline component with
 * 34x34 buttons and no `hitSlop` — under both Apple's 44pt floor and WCAG 2.5.5
 * (audit P1-6). The buttons here are `IconButton`s, which enforce 44x44 and a
 * label by construction.
 *
 * `role="adjustable"` with `accessibilityValue` is what lets a VoiceOver user
 * swipe up/down to change the value instead of hunting for two small targets —
 * the whole reason the role exists.
 */
export function Stepper({ label, value, onChange, min = 0, max = 99, unit, style }: Props) {
  const spoken = unit ? `${value} ${unit}` : String(value);

  function set(next: number) {
    const clamped = Math.min(max, Math.max(min, next));
    if (clamped === value) return;
    hapticSelection();
    onChange(clamped);
  }

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: spoken }}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') set(value + 1);
        if (e.nativeEvent.actionName === 'decrement') set(value - 1);
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
    >
      <View style={styles.textBlock}>
        <AppText variant="captionSm">{label}</AppText>
        <AppText variant="subheading">{spoken}</AppText>
      </View>
      <View style={styles.controls}>
        <IconButton
          icon={Minus}
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => set(value - 1)}
          disabled={value <= min}
          variant="outlined"
        />
        <IconButton
          icon={Plus}
          accessibilityLabel={`Increase ${label}`}
          onPress={() => set(value + 1)}
          disabled={value >= max}
          variant="outlined"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: minTouchTarget,
    paddingStart: 14,
    paddingEnd: space.sm,
    paddingVertical: space.sm,
    backgroundColor: theme.background.secondary,
    borderWidth: 1,
    borderColor: theme.border.hairline,
    borderRadius: 5,
  },
  textBlock: { flex: 1, marginEnd: space.sm },
  controls: { flexDirection: 'row', gap: 5 },
});

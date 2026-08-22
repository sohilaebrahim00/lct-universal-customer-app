import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { AppText } from './Typography';
import { IconButton } from './IconButton';
import { space } from '../../theme';
import { isRTL } from '../../i18n/rtl';

interface Props {
  title?: string;
  eyebrow?: string;
  onBack?: () => void;
  /** Trailing action slot. */
  right?: ReactNode;
  /** Sits between the back control and the title — used by the booking steps for the ProgressRail. */
  center?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Back control, title, trailing slot.
 *
 * The chevron points toward the reading direction's START, which is why it
 * flips under RTL — "back" is a direction, not a glyph. `src/i18n/rtl.ts` has
 * been saying so since before the redesign; this is one of the few places that
 * was already listening.
 *
 * The back control is a 38pt circular `IconButton`, so it carries a label and a
 * 44pt touch target for free. `book/_layout.tsx` sets `headerShown: false` and
 * no booking screen rendered a header at all, leaving the OS gesture as the only
 * way back (audit P0-7) — this is what fills that gap.
 */
export function ScreenHeader({ title, eyebrow, onBack, right, center, style }: Props) {
  const BackIcon = isRTL() ? ChevronRight : ChevronLeft;

  return (
    <View style={[styles.row, style]}>
      {onBack ? (
        <IconButton
          icon={BackIcon}
          accessibilityLabel="Go back"
          variant="circular"
          onPress={onBack}
          style={styles.back}
        />
      ) : null}

      {center ?? (
        <View style={styles.titleBlock}>
          {eyebrow ? <AppText variant="eyebrow">{eyebrow}</AppText> : null}
          {title ? (
            <AppText variant="title" numberOfLines={1} accessibilityRole="header">
              {title}
            </AppText>
          ) : null}
        </View>
      )}

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginBottom: space.md },
  back: { marginEnd: space.smd },
  titleBlock: { flex: 1 },
  right: { marginStart: space.sm, alignItems: 'flex-end' },
});

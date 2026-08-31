import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { AppText } from './Typography';
import { IconButton } from './IconButton';
import { space } from '../../theme';

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
 * The chevron is a fixed `ChevronLeft` — English only, LTR only (see
 * DESIGN_CHANGELOG.md, 2026-08-30; Arabic/RTL support was built and then
 * reversed as a business decision, not a technical one).
 *
 * The back control is a 38pt circular `IconButton`, so it carries a label and a
 * 44pt touch target for free. `book/_layout.tsx` sets `headerShown: false` and
 * no booking screen rendered a header at all, leaving the OS gesture as the only
 * way back (audit P0-7) — this is what fills that gap.
 */
export function ScreenHeader({ title, eyebrow, onBack, right, center, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      {onBack ? (
        <IconButton
          icon={ChevronLeft}
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

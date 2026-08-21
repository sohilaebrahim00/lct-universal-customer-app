import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { AppText } from './Typography';
import { colors, radius, spacing } from '../../theme/tokens';
import { isRTL } from '../../i18n/rtl';

interface Props {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  right?: ReactNode;
}

/** Shared top-of-screen header: optional back action, title, optional eyebrow, and a right-side action slot. */
export function ScreenHeader({ title, eyebrow, onBack, right }: Props) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
          {isRTL() ? (
            <ChevronRight size={22} color={colors.offWhite} strokeWidth={1.75} />
          ) : (
            <ChevronLeft size={22} color={colors.offWhite} strokeWidth={1.75} />
          )}
        </Pressable>
      ) : null}
      <View style={styles.titleBlock}>
        {eyebrow ? (
          <AppText variant="eyebrow" style={styles.eyebrow}>
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="heading" numberOfLines={1}>
          {title}
        </AppText>
      </View>
      {right ? <View style={styles.rightSlot}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.charcoal,
    marginEnd: spacing.sm,
  },
  titleBlock: { flex: 1 },
  eyebrow: { marginBottom: 2 },
  rightSlot: { marginStart: spacing.sm, alignItems: 'flex-end' },
});

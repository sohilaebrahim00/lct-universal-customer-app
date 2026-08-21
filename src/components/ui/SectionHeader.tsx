import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './Typography';
import { colors, spacing } from '../../theme/tokens';

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  right?: ReactNode;
}

/** Recurring "section title + optional trailing action" row, e.g. "Upcoming" / "See all". */
export function SectionHeader({ title, subtitle, actionLabel, onAction, right }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.titleBlock}>
        <AppText variant="heading">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <AppText variant="caption" color={colors.gold}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : (
        right ?? null
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  titleBlock: { flex: 1 },
  subtitle: { marginTop: 2 },
});

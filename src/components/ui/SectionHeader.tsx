import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './Typography';
import { space, theme } from '../../theme';

interface Props {
  title: string;
  /** Trailing text action, e.g. "See all". */
  actionLabel?: string;
  onAction?: () => void;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * "BOOK AGAIN", "TRAVEL", "PAYMENT METHOD".
 *
 * Manrope `section`, uppercase, tracked — NOT the 28px Cormorant this used to
 * be. A display serif on a functional list header is the clearest case of the
 * serif doing utility work, which is what stops it signifying anything
 * (audit P1-2). Structure is sans; the serif carries content.
 */
export function SectionHeader({ title, actionLabel, onAction, right, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <AppText variant="section" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel} hitSlop={12}>
          <AppText variant="caption" color={theme.content.accentSoft}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : (
        (right ?? null)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.smd },
  title: { flex: 1 },
});

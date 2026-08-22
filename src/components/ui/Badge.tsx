import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './Typography';
import { radius, theme } from '../../theme';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'danger';

interface Props {
  label: string;
  tone?: BadgeTone;
  /** A leading dot, for a badge that marks something live. */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TONE: Record<BadgeTone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: theme.background.tertiary, fg: theme.content.tertiary, border: 'transparent' },
  accent: { bg: theme.background.accentFaint, fg: theme.content.accentEmphasis, border: theme.border.accent },
  success: { bg: theme.background.successTint, fg: theme.content.success, border: 'transparent' },
  danger: { bg: theme.background.dangerTint, fg: theme.content.danger, border: theme.border.dangerTint },
};

/**
 * A small label attached to something else — a corporate account, a count, a
 * qualifier. Distinct from StatusPill, which specifically carries trip status
 * and owns the five progressively-deeper gold stages.
 *
 * `role="text"` with an explicit label: uppercase, letter-spaced `micro` text is
 * read unreliably by some screen readers, which can spell out a tracked word
 * rather than saying it.
 */
export function Badge({ label, tone = 'neutral', dot = false, style }: Props) {
  const spec = TONE[tone];
  return (
    <View
      style={[styles.badge, { backgroundColor: spec.bg, borderColor: spec.border }, style]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: spec.fg }]} /> : null}
      <AppText variant="micro" color={spec.fg} accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  dot: { width: 5, height: 5, borderRadius: radius.full, marginEnd: 6 },
});

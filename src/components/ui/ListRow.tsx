import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { AppText } from './Typography';
import { iconSize, iconStroke, minTouchTarget, space, theme } from '../../theme';
import { isRTL } from '../../i18n/rtl';

interface Props {
  title: string;
  /** Secondary line under the title. */
  subtitle?: string;
  /** Trailing value, e.g. a count or "Amex ···· 4021". */
  value?: string;
  icon?: LucideIcon;
  /** Overrides the icon colour. See the note below before reaching for gold. */
  iconColor?: string;
  onPress?: () => void;
  /** Hides the trailing chevron on a row that is pressable but not navigational. */
  chevron?: boolean;
  /** Anything custom on the trailing edge — a Switch, a Badge. Replaces `value` and the chevron. */
  trailing?: ReactNode;
  /** Draws a hairline under the row. Set false on the last row of a group. */
  divider?: boolean;
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The icon + title + value + chevron row, previously copy-pasted into five
 * screens with five slightly different paddings.
 *
 * ── Why the icon is not gold ────────────────────────────────────────────────
 * 73 of 107 icon colour assignments in the app were gold — 68%. At that density
 * gold means "icon", which leaves it unable to also mean "action", and the whole
 * accent budget is spent on chrome (audit P0-1). Gold is now the primary action,
 * the active tab, selection, focus and typographic eyebrows. Row icons are
 * `content.secondary`; `content.tertiary` for a row that is deliberately quiet.
 *
 * ── Direction ──────────────────────────────────────────────────────────────
 * The chevron points toward the reading direction's end, so it flips under RTL.
 * Spacing uses logical properties (`marginStart`/`marginEnd`), which mirror on
 * their own; `marginLeft`/`marginRight` never would.
 */
export function ListRow({
  title,
  subtitle,
  value,
  icon: Icon,
  iconColor,
  onPress,
  chevron = true,
  trailing,
  divider = true,
  destructive = false,
  style,
}: Props) {
  const Chevron = isRTL() ? ChevronLeft : ChevronRight;
  const titleColor = destructive ? theme.content.danger : theme.content.primary;

  const body = (
    <View style={[styles.row, divider ? styles.divided : null, style]}>
      {Icon ? (
        <Icon
          size={iconSize.md}
          color={iconColor ?? (destructive ? theme.content.danger : theme.content.secondary)}
          strokeWidth={iconStroke.decorative}
          style={styles.icon}
        />
      ) : null}

      <View style={styles.textBlock}>
        <AppText variant="subheading" color={titleColor} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="captionSm" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {trailing ?? (
        <>
          {value ? (
            <AppText variant="caption" style={styles.value} numberOfLines={1}>
              {value}
            </AppText>
          ) : null}
          {onPress && chevron ? (
            <Chevron size={iconSize.sm} color={theme.content.tertiary} strokeWidth={iconStroke.interactive} />
          ) : null}
        </>
      )}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join(', ')}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // Padding rather than a fixed height, so the row grows with dynamic type
    // instead of clipping.
    paddingVertical: space.smd,
    paddingHorizontal: space.md,
    minHeight: minTouchTarget,
  },
  divided: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border.hairline,
  },
  icon: { marginEnd: space.smd },
  textBlock: { flex: 1 },
  value: { marginEnd: space.sm },
  pressed: { backgroundColor: theme.background.hoverOverlay },
});

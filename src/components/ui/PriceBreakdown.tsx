import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './Typography';
import { space, theme } from '../../theme';
import { formatCurrency } from '../../lib/format';

export interface FareLine {
  label: string;
  amount: number | string;
}

interface Props {
  lines: FareLine[];
  total: number | string;
  currency?: string;
  /**
   * The reassurance line, e.g. "This is the same $261 you chose the car on."
   * Only pass it when it is TRUE — see the note below.
   */
  reassurance?: string;
  /** Expanded by default. Nothing here is a surprise, so nothing here is hidden. */
  defaultExpanded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The itemised fare.
 *
 * Built and then imported by nobody — `payment.tsx` hand-rolled its own `Row`
 * and its own breakdown instead (audit P0-6). This is the one that ships.
 *
 * ── Expanded by default, and that is the whole design ───────────────────────
 * Fare opacity is Uber's single most-complained-about failure, and the answer is
 * not a disclosure triangle — it is showing the customer every line before they
 * authorise it. The toggle collapses; it does not start collapsed.
 *
 * ── `reassurance` is a claim, not decoration ────────────────────────────────
 * "This is the same $261 you chose the car on" is only true if it is. The
 * caller passes it after comparing the two figures; it must never be a static
 * string. If the backend ever disagrees with the shown total, that is an
 * explicit "the fare changed" interstitial, never a silent substitution and
 * never this line.
 *
 * Every figure is tabular (`variant="figure"`), so the column of amounts aligns
 * on the decimal instead of shuffling per digit.
 */
export function PriceBreakdown({
  lines,
  total,
  currency = 'usd',
  reassurance,
  defaultExpanded = true,
  style,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const totalLabel = formatCurrency(total, currency);

  return (
    <View style={style}>
      <View style={styles.header}>
        <AppText variant="section" accessibilityRole="header">
          What you&apos;re paying
        </AppText>
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Hide fare breakdown' : 'Show fare breakdown'}
          accessibilityState={{ expanded }}
          hitSlop={12}
        >
          <AppText variant="caption" color={theme.content.accentSoft}>
            {expanded ? 'Hide' : 'Show'}
          </AppText>
        </Pressable>
      </View>

      {expanded
        ? lines.map((line) => (
            <View key={line.label} style={styles.row} accessible accessibilityLabel={`${line.label}, ${formatCurrency(line.amount, currency)}`}>
              <AppText variant="caption" color={theme.content.secondary} style={styles.lineLabel}>
                {line.label}
              </AppText>
              <AppText variant="caption" color={theme.content.primary}>
                {formatCurrency(line.amount, currency)}
              </AppText>
            </View>
          ))
        : null}

      <View style={styles.rule} />

      <View style={styles.totalRow} accessible accessibilityLabel={`Total, ${totalLabel}`}>
        <AppText variant="subheading">Total</AppText>
        <AppText variant="heading" color={theme.content.accentEmphasis}>
          {totalLabel}
        </AppText>
      </View>

      {reassurance ? (
        <AppText variant="captionSm" color={theme.content.success} style={styles.reassurance}>
          {reassurance}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  lineLabel: { flex: 1, marginEnd: space.sm },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border.hairlineStrong, marginVertical: space.sm },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  reassurance: { marginTop: space.sm },
});

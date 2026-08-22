import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './Typography';
import { radius, theme } from '../../theme';

interface Props {
  /** 1-based. */
  step: number;
  total: number;
  /** The step's own name, e.g. "Pickup". Rendered as "STEP 1 OF 5 · PICKUP". */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Replaces `booking/StepHeader.tsx`, whose own comment conceded it was "only
 * rendered starting at vehicle selection (step 3)" — so the two full-screen map
 * pickers, by far the longest-dwell steps in the flow, showed no progress at all
 * (audit P0-7). This rail is small enough to ride on a map overlay, which is
 * what made that possible.
 *
 * The segments are decorative; the accessible name carries the whole state in
 * one string, so a screen reader says "Step 1 of 5, Pickup" instead of counting
 * five anonymous views.
 */
export function ProgressRail({ step, total, label, style }: Props) {
  const heading = label ? `Step ${step} of ${total} · ${label}` : `Step ${step} of ${total}`;

  return (
    <View style={style} accessible accessibilityRole="progressbar" accessibilityLabel={heading}
      accessibilityValue={{ min: 1, max: total, now: step }}>
      <AppText variant="eyebrow" style={styles.label} accessibilityElementsHidden importantForAccessibility="no">
        {heading}
      </AppText>
      <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no">
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.segment, i < step ? styles.segmentFilled : null]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  track: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 2, borderRadius: radius.full, backgroundColor: theme.border.hairlineStrong },
  segmentFilled: { backgroundColor: theme.content.accent },
});

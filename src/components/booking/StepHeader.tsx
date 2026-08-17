import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';
import { AppText } from '../ui/Typography';

const TOTAL_STEPS = 6;

export function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={styles.track}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View key={i} style={[styles.segment, i < step ? styles.segmentActive : null]} />
        ))}
      </View>
      <AppText variant="caption" style={{ marginTop: spacing.sm }}>
        Step {step} of {TOTAL_STEPS}
      </AppText>
      <AppText variant="title" style={{ marginTop: spacing.xs }}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="bodyMuted" style={{ marginTop: spacing.xs }}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: radius.full, backgroundColor: colors.charcoal },
  segmentActive: { backgroundColor: colors.gold },
});

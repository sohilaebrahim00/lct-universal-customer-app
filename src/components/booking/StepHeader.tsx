import { StyleSheet, View } from 'react-native';
import { radius, space, theme } from '../../theme';
import { AppText } from '../ui/Typography';

// Pickup and destination are full-screen map pickers (no room for a step
// tracker) but still count as steps 1-2 in the sequence; StepHeader is only
// rendered starting at vehicle selection (step 3).
const TOTAL_STEPS = 5;

export function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <View style={styles.track}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View key={i} style={[styles.segment, i < step ? styles.segmentActive : null]} />
        ))}
      </View>
      <AppText variant="caption" style={{ marginTop: space.sm }}>
        Step {step} of {TOTAL_STEPS}
      </AppText>
      <AppText variant="title" style={{ marginTop: space.xs }}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="bodyMuted" style={{ marginTop: space.xs }}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: radius.full, backgroundColor: theme.background.tertiary },
  segmentActive: { backgroundColor: theme.content.accent },
});

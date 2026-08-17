import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './ui/Typography';
import { colors, radius, spacing } from '../theme/tokens';

const REASONS = [
  { icon: 'person-outline' as const, title: 'Professional Chauffeurs', desc: 'Vetted, trained, and dressed for the occasion.' },
  { icon: 'car-sport-outline' as const, title: 'Premium Fleet', desc: 'Late-model Mercedes-Benz sedans, SUVs, and Sprinters.' },
  { icon: 'airplane-outline' as const, title: 'Airport Specialists', desc: 'Flight tracking and meet & greet, done right.' },
  { icon: 'business-outline' as const, title: 'Corporate Solutions', desc: 'Centralized billing for teams and executives.' },
  { icon: 'time-outline' as const, title: 'On-Time Service', desc: 'Every pickup, on the minute — no exceptions.' },
];

export function WhyChooseLct() {
  return (
    <View>
      {REASONS.map((reason) => (
        <View key={reason.title} style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name={reason.icon} size={22} color={colors.gold} />
          </View>
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <AppText variant="subheading">{reason.title}</AppText>
            <AppText variant="caption" style={{ marginTop: 2 }}>
              {reason.desc}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: 'rgba(217,177,96,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { StyleSheet, View } from 'react-native';
import { User, Car, Plane, Building2, Clock } from 'lucide-react-native';
import { AppText } from './ui/Typography';
import { radius, space, theme } from '../theme';

const REASONS = [
  { icon: User, title: 'Professional Chauffeurs', desc: 'Vetted, trained, and dressed for the occasion.' },
  { icon: Car, title: 'Premium Fleet', desc: 'Late-model Mercedes-Benz sedans, SUVs, and Sprinters.' },
  { icon: Plane, title: 'Airport Specialists', desc: 'Flight tracking and meet & greet, done right.' },
  { icon: Building2, title: 'Corporate Solutions', desc: 'Centralized billing for teams and executives.' },
  { icon: Clock, title: 'On-Time Service', desc: 'Every pickup, on the minute — no exceptions.' },
];

export function WhyChooseLct() {
  return (
    <View>
      {REASONS.map((reason) => (
        <View key={reason.title} style={styles.row}>
          <View style={styles.iconWrap}>
            <reason.icon size={22} color={theme.content.accent} strokeWidth={1.5} />
          </View>
          <View style={{ marginStart: space.md, flex: 1 }}>
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
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: 'rgba(217,177,96,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

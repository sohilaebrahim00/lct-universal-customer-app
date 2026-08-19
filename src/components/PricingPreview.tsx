import { View } from 'react-native';
import { Car, Truck, Bus } from 'lucide-react-native';
import { Card } from './ui/Card';
import { Divider } from './ui/Divider';
import { AppText } from './ui/Typography';
import { colors, spacing } from '../theme/tokens';

const DEMO_RATES = [
  { icon: Car, name: 'Mercedes Sedan', rate: '$100/hr' },
  { icon: Truck, name: 'Luxury SUV', rate: '$120/hr' },
  { icon: Bus, name: 'Sprinter', rate: '$200/hr' },
];

/**
 * Fixed, presentation-only demo numbers — deliberately not wired to
 * vehiclesApi. Real fares (shown in the booking flow and on Fleet/vehicle
 * detail screens) come from the live backend; this card exists purely to
 * give a premium "starting from" glance on Home without depending on the
 * backend being configured, and never initiates a charge.
 */
export function PricingPreview() {
  return (
    <Card>
      {DEMO_RATES.map((vehicle, i) => (
        <View key={vehicle.name}>
          {i > 0 ? <Divider /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs }}>
            <vehicle.icon size={20} color={colors.gold} strokeWidth={1.5} />
            <AppText variant="body" style={{ marginLeft: spacing.sm, flex: 1 }}>
              {vehicle.name}
            </AppText>
            <AppText variant="subheading" color={colors.gold}>
              {vehicle.rate}
            </AppText>
          </View>
        </View>
      ))}
      <AppText variant="caption" style={{ marginTop: spacing.sm }}>
        Starting rates shown. Final pricing depends on trip details.
      </AppText>
    </Card>
  );
}

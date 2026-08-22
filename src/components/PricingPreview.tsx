import { View } from 'react-native';
import { Car, Truck, Bus } from 'lucide-react-native';
import { Card } from './ui/Card';
import { Divider } from './ui/Divider';
import { AppText } from './ui/Typography';
import { space, theme } from '../theme';

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
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.xs }}>
            <vehicle.icon size={20} color={theme.content.accent} strokeWidth={1.5} />
            <AppText variant="body" style={{ marginStart: space.sm, flex: 1 }}>
              {vehicle.name}
            </AppText>
            <AppText variant="subheading" color={theme.content.accent}>
              {vehicle.rate}
            </AppText>
          </View>
        </View>
      ))}
      <AppText variant="caption" style={{ marginTop: space.sm }}>
        Starting rates shown. Final pricing depends on trip details.
      </AppText>
    </Card>
  );
}

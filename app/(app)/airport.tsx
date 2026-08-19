import { useRouter } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { Plane, User, Footprints, Briefcase, Clock } from 'lucide-react-native';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { AppText } from '../../src/components/ui/Typography';
import { FadeSlideIn } from '../../src/components/ui/FadeSlideIn';
import { colors, spacing } from '../../src/theme/tokens';
import { useBookingFormStore } from '../../src/store/bookingFormStore';

const FEATURES = [
  { icon: Plane, title: 'Flight Monitoring', desc: 'We track your flight in real time and adjust for delays automatically.' },
  { icon: User, title: 'Professional Chauffeur', desc: 'A licensed, uniformed chauffeur meets you at every pickup.' },
  { icon: Footprints, title: 'Meet & Greet Service', desc: 'Your chauffeur waits inside arrivals with a name sign.' },
  { icon: Briefcase, title: 'Luggage Assistance', desc: 'Every bag handled from curb to vehicle and back.' },
  { icon: Clock, title: 'Complimentary Waiting Time', desc: 'Extra time built in so a slow deplaning never costs you.' },
];

export default function AirportScreen() {
  const router = useRouter();
  const resetDraft = useBookingFormStore((s) => s.reset);
  const updateDraft = useBookingFormStore((s) => s.update);

  function handleBook() {
    resetDraft();
    updateDraft({ serviceType: 'airport' });
    router.push('/(app)/book/pickup');
  }

  return (
    <ScreenContainer padded={false}>
      <Image source={require('../../assets/airport/hero.jpg')} style={styles.hero} resizeMode="cover" />
      <View style={styles.heroOverlay} />
      <View style={styles.heroContent}>
        <AppText variant="eyebrow" style={{ marginBottom: spacing.xs }}>
          Airport Transfers
        </AppText>
        <AppText variant="display">Airport Transfers Made Effortless</AppText>
      </View>

      <View style={{ padding: spacing.lg }}>
        <FadeSlideIn>
          <AppText variant="bodyMuted" style={{ marginBottom: spacing.xl }}>
            From DFW to Dallas Love Field and beyond — a seamless, flight-aware pickup every time, so travel days
            start and end without friction.
          </AppText>
        </FadeSlideIn>

        <View style={{ marginBottom: spacing.xl }}>
          {FEATURES.map((feature, i) => (
            <FadeSlideIn key={feature.title} delay={i * 60}>
              <Card style={{ marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'flex-start' }}>
                <feature.icon size={22} color={colors.gold} strokeWidth={1.5} style={{ marginTop: 2 }} />
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <AppText variant="subheading">{feature.title}</AppText>
                  <AppText variant="caption" style={{ marginTop: 2 }}>
                    {feature.desc}
                  </AppText>
                </View>
              </Card>
            </FadeSlideIn>
          ))}
        </View>

        <FadeSlideIn delay={320}>
          <Button label="Book Airport Transfer" onPress={handleBook} />
        </FadeSlideIn>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 220 },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 220, backgroundColor: 'rgba(2,2,1,0.5)' },
  heroContent: { position: 'absolute', top: 0, left: 0, right: 0, padding: spacing.lg, paddingTop: spacing.xxl },
});

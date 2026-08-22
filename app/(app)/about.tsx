import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ShieldCheck, Award, Heart, Compass } from 'lucide-react-native';
import { Button } from '../../src/components/ui/Button';
import { Divider } from '../../src/components/ui/Divider';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { AppText } from '../../src/components/ui/Typography';
import { FadeSlideIn } from '../../src/components/ui/FadeSlideIn';
import { radius, space, theme } from '../../src/theme';
import { AppImage } from '../../src/components/ui/AppImage';

const VALUES = [
  { icon: ShieldCheck, title: 'Discretion', desc: 'What happens in our vehicles stays there.' },
  { icon: Award, title: 'Excellence', desc: 'Every detail, every time.' },
  { icon: Heart, title: 'Service', desc: 'A concierge mindset in every interaction.' },
  { icon: Compass, title: 'Craft', desc: 'Doing one thing extraordinarily well.' },
];

export default function AboutScreen() {
  const router = useRouter();

  return (
    <ScreenContainer padded={false}>
      <AppImage source={require('../../assets/about/hero.jpg')} style={styles.hero} priority="high" />
      <View style={styles.heroOverlay}>
        <AppText variant="eyebrow" style={{ marginBottom: space.xs }}>
          Our Story
        </AppText>
        <AppText variant="display">A quiet standard, kept.</AppText>
        <AppText variant="bodyMuted" style={{ marginTop: space.sm }}>
          Founded 2025 to elevate luxury ground transportation across Dallas–Fort Worth and Grapevine, Texas.
        </AppText>
      </View>

      <View style={{ padding: space.lg }}>
        <FadeSlideIn>
          <AppImage source={require('../../assets/about/portrait.jpg')} style={styles.portrait} />
        </FadeSlideIn>

        <FadeSlideIn delay={80}>
          <AppText variant="eyebrow" style={{ marginTop: space.lg, marginBottom: space.xs }}>
            Mission
          </AppText>
          <AppText variant="heading" style={{ marginBottom: space.sm }}>
            The private mode of travel.
          </AppText>
          <AppText variant="bodyMuted" style={{ marginBottom: space.xl }}>
            From boardrooms to weddings, LCT Universal operates as a silent partner — solving the transportation
            question so completely you forget it was ever asked.
          </AppText>
        </FadeSlideIn>

        <FadeSlideIn delay={140}>
          <View style={styles.valuesCard}>
            {VALUES.map((value, i) => (
              <View key={value.title}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.valueRow}>
                  <value.icon size={22} color={theme.content.accent} strokeWidth={1.5} />
                  <View style={{ marginStart: space.md, flex: 1 }}>
                    <AppText variant="subheading">{value.title}</AppText>
                    <AppText variant="caption">{value.desc}</AppText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </FadeSlideIn>

        <FadeSlideIn delay={200}>
          <Button label="Reserve Your Ride" onPress={() => router.push('/(app)/book')} style={{ marginTop: space.xl }} />
        </FadeSlideIn>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 220 },
  heroOverlay: { padding: space.lg, paddingTop: space.md },
  portrait: { width: '100%', height: 260, borderRadius: radius.lg },
  valuesCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.border.hairline,
    backgroundColor: theme.background.secondary,
    paddingHorizontal: space.md,
  },
  valueRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
});

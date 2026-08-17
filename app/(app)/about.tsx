import { useRouter } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/ui/Button';
import { Divider } from '../../src/components/ui/Divider';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { AppText } from '../../src/components/ui/Typography';
import { FadeSlideIn } from '../../src/components/ui/FadeSlideIn';
import { colors, radius, spacing } from '../../src/theme/tokens';

const VALUES = [
  { icon: 'shield-checkmark-outline' as const, title: 'Discretion', desc: 'What happens in our vehicles stays there.' },
  { icon: 'ribbon-outline' as const, title: 'Excellence', desc: 'Every detail, every time.' },
  { icon: 'heart-outline' as const, title: 'Service', desc: 'A concierge mindset in every interaction.' },
  { icon: 'compass-outline' as const, title: 'Craft', desc: 'Doing one thing extraordinarily well.' },
];

export default function AboutScreen() {
  const router = useRouter();

  return (
    <ScreenContainer padded={false}>
      <Image source={require('../../assets/about/hero.jpg')} style={styles.hero} resizeMode="cover" />
      <View style={styles.heroOverlay}>
        <AppText variant="eyebrow" style={{ marginBottom: spacing.xs }}>
          Our Story
        </AppText>
        <AppText variant="display">A quiet standard, kept.</AppText>
        <AppText variant="bodyMuted" style={{ marginTop: spacing.sm }}>
          Founded 2025 to elevate luxury ground transportation across Dallas–Fort Worth and Grapevine, Texas.
        </AppText>
      </View>

      <View style={{ padding: spacing.lg }}>
        <FadeSlideIn>
          <Image source={require('../../assets/about/portrait.jpg')} style={styles.portrait} resizeMode="cover" />
        </FadeSlideIn>

        <FadeSlideIn delay={80}>
          <AppText variant="eyebrow" style={{ marginTop: spacing.lg, marginBottom: spacing.xs }}>
            Mission
          </AppText>
          <AppText variant="heading" style={{ marginBottom: spacing.sm }}>
            The private mode of travel.
          </AppText>
          <AppText variant="bodyMuted" style={{ marginBottom: spacing.xl }}>
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
                  <Ionicons name={value.icon} size={22} color={colors.gold} />
                  <View style={{ marginLeft: spacing.md, flex: 1 }}>
                    <AppText variant="subheading">{value.title}</AppText>
                    <AppText variant="caption">{value.desc}</AppText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </FadeSlideIn>

        <FadeSlideIn delay={200}>
          <Button label="Reserve Your Ride" onPress={() => router.push('/(app)/book')} style={{ marginTop: spacing.xl }} />
        </FadeSlideIn>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 220 },
  heroOverlay: { padding: spacing.lg, paddingTop: spacing.md },
  portrait: { width: '100%', height: 260, borderRadius: radius.lg },
  valuesCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.onyx,
    paddingHorizontal: spacing.md,
  },
  valueRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
});

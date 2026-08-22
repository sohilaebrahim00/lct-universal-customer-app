import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { FadeSlideIn } from '../../../src/components/ui/FadeSlideIn';
import { colors, radius, shadows, spacing } from '../../../src/theme/tokens';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { SERVICES } from '../../../src/lib/services';
import { SERVICE_ICON_COMPONENTS } from '../../../src/lib/serviceIcons';

export default function ServiceStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const update = useBookingFormStore((s) => s.update);

  return (
    <ScreenContainer>
      <AppText variant="eyebrow">New Booking</AppText>
      <AppText variant="title" style={{ marginBottom: spacing.xs }}>
        Choose Your Service
      </AppText>
      <AppText variant="bodyMuted" style={{ marginBottom: spacing.lg }}>
        What kind of trip are you planning?
      </AppText>

      <View style={{ gap: spacing.md }}>
        {SERVICES.map((service, i) => {
          const selected = draft.serviceType === service.type;
          const Icon = SERVICE_ICON_COMPONENTS[service.icon];
          return (
            <FadeSlideIn key={service.type} delay={i * 60}>
              <Pressable
                onPress={() => update({ serviceType: service.type })}
                accessibilityRole="radio"
                accessibilityLabel={service.label}
                accessibilityState={{ selected }}
                style={[styles.card, shadows.card, selected ? styles.cardSelected : null]}
              >
                <Image source={service.image} style={styles.image} resizeMode="cover" />
                <View style={styles.scrim} />
                <View style={styles.iconBadge}>
                  <Icon size={18} color={colors.gold} strokeWidth={1.5} />
                </View>
                {selected ? (
                  <View style={styles.checkBadge}>
                    <CheckCircle2 size={22} color={colors.gold} strokeWidth={1.5} fill={colors.surfaceBlack} />
                  </View>
                ) : null}
                <View style={styles.textBlock}>
                  <AppText variant="subheading">{service.label}</AppText>
                  <AppText variant="caption" style={{ marginTop: 2 }}>
                    {service.description}
                  </AppText>
                </View>
              </Pressable>
            </FadeSlideIn>
          );
        })}
      </View>

      <Button
        label="Continue"
        onPress={() => router.push('/(app)/book/pickup')}
        disabled={!draft.serviceType}
        style={{ marginTop: spacing.xl }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 148,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'flex-end',
  },
  cardSelected: {
    borderColor: colors.gold,
    borderWidth: 1.5,
  },
  image: { ...StyleSheet.absoluteFill },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2,2,1,0.35)',
  },
  iconBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(2,2,1,0.55)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  textBlock: {
    padding: spacing.md,
    backgroundColor: 'rgba(2,2,1,0.55)',
  },
});

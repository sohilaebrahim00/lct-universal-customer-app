import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { FadeSlideIn } from '../../../src/components/ui/FadeSlideIn';
import { elevation, radius, space, theme } from '../../../src/theme';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { SERVICES } from '../../../src/lib/services';
import { SERVICE_ICON_COMPONENTS } from '../../../src/lib/serviceIcons';
import { AppImage } from '../../../src/components/ui/AppImage';

export default function ServiceStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const update = useBookingFormStore((s) => s.update);

  return (
    <ScreenContainer>
      <AppText variant="eyebrow">New Booking</AppText>
      <AppText variant="title" style={{ marginBottom: space.xs }}>
        Choose Your Service
      </AppText>
      <AppText variant="bodyMuted" style={{ marginBottom: space.lg }}>
        What kind of trip are you planning?
      </AppText>

      <View style={{ gap: space.md }}>
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
                style={[styles.card, styles.cardShadow, selected ? styles.cardSelected : null]}
              >
                <AppImage source={service.image} style={styles.image} />
                <View style={styles.scrim} />
                <View style={styles.iconBadge}>
                  <Icon size={18} color={theme.content.accent} strokeWidth={1.5} />
                </View>
                {selected ? (
                  <View style={styles.checkBadge}>
                    <CheckCircle2 size={22} color={theme.content.accent} strokeWidth={1.5} fill={theme.background.primary} />
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
        style={{ marginTop: space.xl }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  /*
   * The shadow half of `elevation.card`.
   *
   * `shadows.card` was the last symbol living only in the token shim, and the
   * only thing keeping any file on it. `elevation.card` is its replacement but
   * also carries a fill and a border, which this card sets for itself over a
   * photograph — so the shadow is taken and the rest is not.
   */
  cardShadow: {
    shadowColor: elevation.card.shadowColor,
    shadowOffset: elevation.card.shadowOffset,
    shadowOpacity: elevation.card.shadowOpacity,
    shadowRadius: elevation.card.shadowRadius,
    elevation: elevation.card.elevation,
  },
  card: {
    height: 148,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border.hairline,
    justifyContent: 'flex-end',
  },
  cardSelected: {
    borderColor: theme.content.accent,
    borderWidth: 1.5,
  },
  image: { ...StyleSheet.absoluteFill },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2,2,1,0.35)',
  },
  iconBadge: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(2,2,1,0.55)',
    borderWidth: 1,
    borderColor: theme.border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
  },
  textBlock: {
    padding: space.md,
    backgroundColor: 'rgba(2,2,1,0.55)',
  },
});

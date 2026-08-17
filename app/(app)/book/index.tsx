import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../src/components/ui/Button';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, radius, spacing } from '../../../src/theme/tokens';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { SERVICES } from '../../../src/lib/services';

export default function ServiceStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const update = useBookingFormStore((s) => s.update);

  return (
    <ScreenContainer>
      <AppText variant="eyebrow">New Booking</AppText>
      <AppText variant="title" style={{ marginBottom: spacing.xs }}>
        Choose a Service
      </AppText>
      <AppText variant="bodyMuted" style={{ marginBottom: spacing.lg }}>
        What kind of trip are you planning?
      </AppText>

      <View style={{ gap: spacing.sm }}>
        {SERVICES.map((service) => {
          const selected = draft.serviceType === service.type;
          return (
            <Pressable
              key={service.type}
              onPress={() => update({ serviceType: service.type })}
              style={[styles.row, selected ? styles.rowSelected : null]}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={service.icon} size={22} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="subheading">{service.label}</AppText>
                <AppText variant="caption">{service.description}</AppText>
              </View>
              {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.gold} /> : null}
            </Pressable>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.onyx,
  },
  rowSelected: { borderColor: colors.gold },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: 'rgba(217,177,96,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

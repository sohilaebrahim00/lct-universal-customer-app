import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StepHeader } from '../../../src/components/booking/StepHeader';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { TextField } from '../../../src/components/ui/TextField';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, radius, spacing } from '../../../src/theme/tokens';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { useAuthStore } from '../../../src/store/authStore';

function Stepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <Card style={{ marginBottom: spacing.md }}>
      <View style={styles.stepperRow}>
        <AppText variant="subheading">{label}</AppText>
        <View style={styles.stepper}>
          <Pressable style={styles.stepperButton} onPress={() => onChange(Math.max(min, value - 1))}>
            <Ionicons name="remove" size={18} color={colors.gold} />
          </Pressable>
          <AppText variant="heading" style={{ minWidth: 28, textAlign: 'center' }}>
            {value}
          </AppText>
          <Pressable style={styles.stepperButton} onPress={() => onChange(Math.min(max, value + 1))}>
            <Ionicons name="add" size={18} color={colors.gold} />
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

export default function DetailsStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const update = useBookingFormStore((s) => s.update);
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    if (profile && !draft.primaryPassengerName) {
      update({ primaryPassengerName: profile.full_name, primaryPassengerPhone: profile.phone ?? '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  return (
    <ScreenContainer>
      <StepHeader step={4} title="Trip Details" subtitle="Passengers, luggage, and anything we should know." />

      <Stepper label="Passengers" value={draft.passengerCount} onChange={(v) => update({ passengerCount: v })} min={1} max={40} />
      <Stepper label="Luggage" value={draft.luggageCount} onChange={(v) => update({ luggageCount: v })} min={0} max={40} />

      <TextField
        label="Passenger Name"
        value={draft.primaryPassengerName}
        onChangeText={(text) => update({ primaryPassengerName: text })}
      />
      <TextField
        label="Passenger Phone"
        value={draft.primaryPassengerPhone}
        onChangeText={(text) => update({ primaryPassengerPhone: text })}
        keyboardType="phone-pad"
      />
      <TextField
        label="Special Requests (optional)"
        value={draft.specialRequests}
        onChangeText={(text) => update({ specialRequests: text })}
        placeholder="Child seat, extra stop, meet-and-greet sign..."
        multiline
        numberOfLines={3}
        style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: spacing.sm }}
      />

      <Button label="Continue" onPress={() => router.push('/(app)/book/vehicle')} style={{ marginTop: spacing.md }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

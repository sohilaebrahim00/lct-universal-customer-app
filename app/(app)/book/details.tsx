import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { StepHeader } from '../../../src/components/booking/StepHeader';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { TextField } from '../../../src/components/ui/TextField';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, radius, spacing } from '../../../src/theme/tokens';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { formatDateTime } from '../../../src/lib/format';

const MIN_LEAD_TIME_MS = 60 * 60 * 1000;

function Stepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <View style={styles.stepperRow}>
      <AppText variant="body">{label}</AppText>
      <View style={styles.stepper}>
        <Pressable style={styles.stepperButton} onPress={() => onChange(Math.max(min, value - 1))}>
          <Ionicons name="remove" size={18} color={colors.gold} />
        </Pressable>
        <AppText variant="subheading" style={{ minWidth: 28, textAlign: 'center' }}>
          {value}
        </AppText>
        <Pressable style={styles.stepperButton} onPress={() => onChange(Math.min(max, value + 1))}>
          <Ionicons name="add" size={18} color={colors.gold} />
        </Pressable>
      </View>
    </View>
  );
}

export default function DetailsStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const update = useBookingFormStore((s) => s.update);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  // Computed once, at mount, via the lazy initializer — not on every
  // render, which would otherwise silently push the minimum bookable time
  // later while the user is still on this screen.
  const [minimumDate] = useState(() => new Date(Date.now() + MIN_LEAD_TIME_MS));

  const selected = draft.scheduledAt ?? minimumDate;
  const isHourly = draft.serviceType === 'hourly';
  const duration = draft.hourlyDurationHours ?? 3;

  function openPicker(mode: 'date' | 'time') {
    setPickerMode(mode);
    setShowPicker(true);
  }

  function handleChange(_event: unknown, date?: Date) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) update({ scheduledAt: date });
  }

  const canContinue = Boolean(draft.scheduledAt) && (!isHourly || duration > 0);

  return (
    <ScreenContainer>
      <StepHeader step={4} title="Trip Details" subtitle="When, how many, and anything we should know." />

      <AppText variant="subheading" style={{ marginBottom: spacing.sm }}>
        Date & Time
      </AppText>
      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.row}>
          <Pressable style={styles.field} onPress={() => openPicker('date')}>
            <Ionicons name="calendar-outline" size={18} color={colors.gold} />
            <AppText variant="body">
              {draft.scheduledAt ? formatDateTime(draft.scheduledAt.toISOString()).split(' at ')[0] : 'Select date'}
            </AppText>
          </Pressable>
          <Pressable style={styles.field} onPress={() => openPicker('time')}>
            <Ionicons name="time-outline" size={18} color={colors.gold} />
            <AppText variant="body">
              {draft.scheduledAt ? formatDateTime(draft.scheduledAt.toISOString()).split(' at ')[1] : 'Select time'}
            </AppText>
          </Pressable>
        </View>
      </Card>

      {showPicker ? (
        <DateTimePicker value={selected} mode={pickerMode} minimumDate={minimumDate} onChange={handleChange} themeVariant="dark" />
      ) : null}

      {isHourly ? (
        <Card style={{ marginBottom: spacing.md }}>
          <Stepper label="Duration (hours)" value={duration} onChange={(v) => update({ hourlyDurationHours: v })} min={1} max={12} />
        </Card>
      ) : null}

      <Card style={{ marginBottom: spacing.md }}>
        <Stepper label="Passengers" value={draft.passengerCount} onChange={(v) => update({ passengerCount: v })} min={1} max={40} />
        <View style={{ height: spacing.sm }} />
        <Stepper label="Luggage" value={draft.luggageCount} onChange={(v) => update({ luggageCount: v })} min={0} max={40} />
      </Card>

      <TextField
        label="Notes (optional)"
        value={draft.specialRequests}
        onChangeText={(text) => update({ specialRequests: text })}
        placeholder="Child seat, extra stop, meet-and-greet sign..."
        multiline
        numberOfLines={3}
        style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: spacing.sm }}
      />

      <Button label="Continue" onPress={() => router.push('/(app)/book/payment')} disabled={!canContinue} style={{ marginTop: spacing.md }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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

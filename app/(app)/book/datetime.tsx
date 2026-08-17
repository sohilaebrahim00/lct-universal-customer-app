import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { StepHeader } from '../../../src/components/booking/StepHeader';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, radius, spacing } from '../../../src/theme/tokens';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { formatDateTime } from '../../../src/lib/format';

const MIN_LEAD_TIME_MS = 60 * 60 * 1000; // 1 hour minimum lead time

export default function DateTimeStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const update = useBookingFormStore((s) => s.update);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const minimumDate = new Date(Date.now() + MIN_LEAD_TIME_MS);
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
      <StepHeader step={3} title="Date & Time" subtitle="When do you need your chauffeur?" />

      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.row}>
          <Pressable style={styles.field} onPress={() => openPicker('date')}>
            <Ionicons name="calendar-outline" size={18} color={colors.gold} />
            <AppText variant="body">{draft.scheduledAt ? formatDateTime(draft.scheduledAt.toISOString()).split(' at ')[0] : 'Select date'}</AppText>
          </Pressable>
          <Pressable style={styles.field} onPress={() => openPicker('time')}>
            <Ionicons name="time-outline" size={18} color={colors.gold} />
            <AppText variant="body">{draft.scheduledAt ? formatDateTime(draft.scheduledAt.toISOString()).split(' at ')[1] : 'Select time'}</AppText>
          </Pressable>
        </View>
      </Card>

      {showPicker ? (
        <DateTimePicker
          value={selected}
          mode={pickerMode}
          minimumDate={minimumDate}
          onChange={handleChange}
          themeVariant="dark"
        />
      ) : null}

      {isHourly ? (
        <Card style={{ marginTop: spacing.md }}>
          <AppText variant="subheading" style={{ marginBottom: spacing.sm }}>
            Duration
          </AppText>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepperButton}
              onPress={() => update({ hourlyDurationHours: Math.max(1, duration - 1) })}
            >
              <Ionicons name="remove" size={20} color={colors.gold} />
            </Pressable>
            <AppText variant="heading">{duration} {duration === 1 ? 'hour' : 'hours'}</AppText>
            <Pressable
              style={styles.stepperButton}
              onPress={() => update({ hourlyDurationHours: Math.min(12, duration + 1) })}
            >
              <Ionicons name="add" size={20} color={colors.gold} />
            </Pressable>
          </View>
        </Card>
      ) : null}

      <Button label="Continue" onPress={() => router.push('/(app)/book/details')} disabled={!canContinue} style={{ marginTop: spacing.xl }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

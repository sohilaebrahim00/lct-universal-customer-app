import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';
import { AppText } from '../ui/Typography';
import { Card } from '../ui/Card';
import { iconSize, iconStroke, space, theme } from '../../theme';
import { formatDateTime } from '../../lib/format';

export interface DateTimeFieldProps {
  /** The chosen instant, or null while incomplete. */
  value: Date | null;
  /** Earliest bookable instant — the one-hour lead time. */
  minimumDate: Date;
  onChange: (value: Date | null) => void;
  /** Rendered under the fields. Never a silently disabled button. */
  error?: string | null;
}

/**
 * NATIVE date/time entry — the real OS picker.
 *
 * `@react-native-community/datetimepicker` has no web implementation at all, so
 * this file is iOS/Android only and `DateTimeField.web.tsx` is its counterpart.
 * Same platform-split pattern as Stripe and react-native-maps elsewhere in this
 * repo; the lazy `require` keeps the native binding untouched anywhere it will
 * not render.
 */
function NativeDateTimePicker(props: {
  value: Date;
  mode: 'date' | 'time';
  minimumDate: Date;
  onChange: (event: unknown, date?: Date) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy load, see comment above.
  const DateTimePicker = require('@react-native-community/datetimepicker').default as typeof import('@react-native-community/datetimepicker').default;
  return <DateTimePicker {...props} themeVariant="dark" />;
}

export function DateTimeField({ value, minimumDate, onChange, error }: DateTimeFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState<'date' | 'time'>('date');

  const selected = value ?? minimumDate;
  const formatted = value ? formatDateTime(value.toISOString()) : null;

  function open(next: 'date' | 'time') {
    setMode(next);
    setShowPicker(true);
  }

  function handleChange(_event: unknown, date?: Date) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) onChange(date);
  }

  return (
    <View>
      <Card style={styles.card}>
        <View style={styles.row}>
          <Pressable
            style={styles.field}
            onPress={() => open('date')}
            accessibilityRole="button"
            accessibilityLabel={formatted ? `Pickup date, ${formatted.split(' at ')[0]}` : 'Select pickup date'}
          >
            <Calendar size={iconSize.md} color={theme.content.secondary} strokeWidth={iconStroke.decorative} />
            <AppText variant="body" style={styles.fieldText}>
              {formatted ? (formatted.split(' at ')[0] ?? 'Select date') : 'Select date'}
            </AppText>
          </Pressable>

          <Pressable
            style={styles.field}
            onPress={() => open('time')}
            accessibilityRole="button"
            accessibilityLabel={formatted ? `Pickup time, ${formatted.split(' at ')[1]}` : 'Select pickup time'}
          >
            <Clock size={iconSize.md} color={theme.content.secondary} strokeWidth={iconStroke.decorative} />
            <AppText variant="body" style={styles.fieldText}>
              {formatted ? (formatted.split(' at ')[1] ?? 'Select time') : 'Select time'}
            </AppText>
          </Pressable>
        </View>
      </Card>

      {showPicker ? (
        <NativeDateTimePicker value={selected} mode={mode} minimumDate={minimumDate} onChange={handleChange} />
      ) : null}

      {error ? (
        <AppText variant="captionSm" color={theme.content.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.sm },
  row: { flexDirection: 'row', gap: space.md },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  fieldText: { marginStart: space.sm },
  error: { marginBottom: space.sm },
});

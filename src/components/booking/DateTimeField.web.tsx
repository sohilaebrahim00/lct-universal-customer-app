import { useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../ui/Typography';
import { radius, space, theme } from '../../theme';
import type { DateTimeFieldProps } from './DateTimeField';

/**
 * WEB date/time entry — the browser's own date and time controls.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * The web fallback used to be two plain text fields expecting `YYYY-MM-DD` and
 * `HH:MM`. A person typing anything else — `2026/9/7`, say — produced an
 * unparseable value, `scheduledAt` never got set, and the primary button sat
 * disabled with nothing on screen explaining why. The booking flow dead-ended,
 * and only a script that set the values programmatically got past it.
 *
 * The web build IS the demo, so a degradation nobody can use is not a
 * degradation. `<input type="date">` and `<input type="time">` give a real
 * calendar and a real clock in every current browser, are keyboard and
 * screen-reader accessible with no work, and emit exactly the two formats the
 * parser wants — which removes the class of bug rather than validating around
 * it.
 *
 * Raw DOM inputs inside a React Native Web tree are fine: RNW renders to real
 * DOM, so an `<input>` composes normally. This file is web-only by the
 * `.web.tsx` extension, exactly like the Stripe and maps counterparts, so the
 * native build never sees it.
 *
 * `colorScheme: 'dark'` is what makes the browser draw its own popup — and the
 * little calendar glyph — in dark rather than as a white panel on a near-black
 * screen.
 */

/** Local-time `YYYY-MM-DD`. `toISOString()` would shift the date across UTC. */
function toDateValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toTimeValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * ── Why these inputs are UNCONTROLLED ───────────────────────────────────────
 * Not a style preference. A controlled date input is broken for anyone typing.
 *
 * `<input type="date">` is segmented, and while a date is half-entered the
 * element reports `value === ''`. A controlled binding writes that empty string
 * straight back and wipes the segments the person just typed, so they can never
 * reach a complete date by keyboard. Picking from the calendar popup happens to
 * work because that is one atomic change — which is exactly why this bug
 * survives any test that only clicks.
 *
 * So the browser owns the intermediate state via `defaultValue`, and React only
 * reads completed values out of the change event. Found by walking the built app
 * with real keystrokes instead of setting values programmatically.
 */
export function DateTimeField({ value, minimumDate, onChange, error }: DateTimeFieldProps) {
  const [dateText] = useState(() => (value ? toDateValue(value) : ''));
  const [timeText] = useState(() => (value ? toTimeValue(value) : ''));
  // The inputs are uncontrolled, so the latest values live in refs. Holding them
  // in state would re-render and reset the segments all over again.
  const dateRef = useRef(dateText);
  const timeRef = useRef(timeText);
  const [focused, setFocused] = useState<'date' | 'time' | null>(null);
  /** Set only when both fields have content that still will not parse. */
  const [parseError, setParseError] = useState<string | null>(null);

  const minDateValue = useMemo(() => toDateValue(minimumDate), [minimumDate]);

  /**
   * Normalise rather than reject.
   *
   * Both controls emit canonical values, but a browser that falls back to a
   * text field (or an autofill) can still deliver something else — so the
   * result is parsed, and a failure becomes an inline message rather than a
   * silently disabled button.
   */
  function commit(nextDate: string, nextTime: string) {
    dateRef.current = nextDate;
    timeRef.current = nextTime;

    if (!nextDate || !nextTime) {
      setParseError(null);
      onChange(null);
      return;
    }

    const parsed = new Date(`${nextDate}T${nextTime}`);
    if (Number.isNaN(parsed.getTime())) {
      setParseError('We could not read that date and time. Please pick them from the calendar and clock.');
      onChange(null);
      return;
    }

    setParseError(null);
    onChange(parsed);
  }

  const shownError = error ?? parseError;

  const inputStyle = (which: 'date' | 'time'): React.CSSProperties => ({
    flex: 1,
    minWidth: 0,
    height: 54,
    boxSizing: 'border-box',
    padding: '0 15px',
    borderRadius: radius.sm,
    backgroundColor: theme.background.inset,
    color: theme.content.primary,
    fontFamily: 'Manrope_400Regular, system-ui, sans-serif',
    fontSize: 15,
    // The control's own boundary IS its affordance, so it uses the 3:1 token.
    border: `1px solid ${shownError ? theme.border.danger : focused === which ? theme.border.selected : theme.border.control}`,
    outline: 'none',
    boxShadow: focused === which && !shownError ? `0 0 0 3px ${theme.border.focusHalo}` : 'none',
    // Makes the browser render its calendar/clock popup and glyph dark.
    colorScheme: 'dark',
  });

  return (
    <View>
      <View style={styles.row}>
        <AppText variant="micro" style={styles.label}>
          Pickup date
        </AppText>
        <AppText variant="micro" style={styles.label}>
          Pickup time
        </AppText>
      </View>

      <div style={{ display: 'flex', gap: space.smd, marginBottom: space.sm }}>
        <input
          type="date"
          aria-label="Pickup date"
          defaultValue={dateText}
          min={minDateValue}
          onChange={(e) => commit(e.target.value, timeRef.current)}
          onFocus={() => setFocused('date')}
          onBlur={() => setFocused(null)}
          style={inputStyle('date')}
        />
        <input
          type="time"
          aria-label="Pickup time"
          defaultValue={timeText}
          onChange={(e) => commit(dateRef.current, e.target.value)}
          onFocus={() => setFocused('time')}
          onBlur={() => setFocused(null)}
          style={inputStyle('time')}
        />
      </div>

      {shownError ? (
        <AppText variant="captionSm" color={theme.content.danger} style={styles.error} accessibilityLiveRegion="polite">
          {shownError}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.smd, marginBottom: space.sm },
  label: { flex: 1 },
  error: { marginBottom: space.sm },
});

import { StyleSheet, View } from 'react-native';
import { radius, space, theme } from '../../theme';
import { TRIP_STATUS_LABELS, type TripStatus } from '../../lib/tripStatus';
import { AppText } from './Typography';

export type PillTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

interface ToneSpec {
  bg: string;
  fg: string;
  /** A leading dot marks a status that is currently in motion. */
  dot?: boolean;
}

/**
 * The five progressively-deeper gold stages that already shipped for trip
 * status, kept as their own map so generalising the component below cannot
 * drift them.
 */
const toneByStatus: Record<TripStatus, ToneSpec> = {
  pending: { bg: theme.background.tertiary, fg: theme.content.tertiary },
  confirmed: { bg: theme.background.accentStrong, fg: theme.content.accentEmphasis },
  driver_assigned: { bg: theme.background.accentStrong, fg: theme.content.accentEmphasis, dot: true },
  driver_arriving: { bg: theme.background.accentStrong, fg: theme.content.accentEmphasis, dot: true },
  passenger_picked_up: { bg: theme.background.accentStrong, fg: theme.content.accentEmphasis, dot: true },
  trip_started: { bg: theme.background.accentStrong, fg: theme.content.accentEmphasis, dot: true },
  completed: { bg: theme.background.successTint, fg: theme.content.success },
  cancelled: { bg: theme.background.dangerTint, fg: theme.content.danger },
};

const toneStyles: Record<PillTone, ToneSpec> = {
  neutral: { bg: theme.background.tertiary, fg: theme.content.tertiary },
  info: { bg: theme.background.accentStrong, fg: theme.content.accentEmphasis },
  success: { bg: theme.background.successTint, fg: theme.content.success },
  warning: { bg: theme.background.accentStrong, fg: theme.content.warning },
  danger: { bg: theme.background.dangerTint, fg: theme.content.danger },
};

type Props =
  | { status: TripStatus; label?: never; tone?: never }
  | { status?: never; label: string; tone?: PillTone };

/**
 * ── The danger tone changed colour, for a measured reason ───────────────────
 * It used the ported `destructive` (#e62b34) on its own soft fill, which
 * composites to 4.31:1 — below AA (audit P1-6). It now uses `content.danger`
 * (#ff6b6b) at 5.44:1. The ported hex is unchanged and still correct for
 * strokes and fills; it was only ever wrong as text on a tint.
 *
 * The pill also carries an `accessibilityLabel`, because uppercase
 * letter-spaced text is read unreliably by some screen readers — VoiceOver can
 * spell out a tracked word rather than saying it.
 */
export function StatusPill(props: Props) {
  const spec = props.status ? toneByStatus[props.status] : toneStyles[props.tone ?? 'neutral'];
  const label = props.status ? TRIP_STATUS_LABELS[props.status] : props.label;

  return (
    <View
      style={[styles.pill, { backgroundColor: spec.bg }]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      {spec.dot ? <View style={[styles.dot, { backgroundColor: spec.fg }]} /> : null}
      <AppText variant="micro" color={spec.fg} accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: space.xs,
    borderRadius: radius.full,
  },
  dot: { width: 5, height: 5, borderRadius: radius.full, marginEnd: 6 },
});

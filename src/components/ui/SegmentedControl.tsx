import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './Typography';
import { elevation, minTouchTarget, radius, theme } from '../../theme';

export interface Segment<T extends string> {
  value: T;
  label: string;
  /** Optional count shown after the label, e.g. "Upcoming 2". */
  count?: number;
}

interface Props<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * An inset track with a raised thumb — the same recessed/raised language as
 * TextField and Card, so "the selected one is the one that looks lifted" holds
 * everywhere in the app.
 *
 * ── Accessibility ──────────────────────────────────────────────────────────
 * Each segment is `role="tab"` inside a `role="tablist"` with
 * `accessibilityState.selected`, which is what makes VoiceOver announce
 * "Upcoming, selected, tab, 1 of 2" rather than reading two unrelated buttons.
 *
 * The thumb does not animate between positions yet. Sliding it is slice 4's
 * motion work; doing it here would mean measuring segment widths on layout, and
 * a half-built slide that jumps on first render is worse than a clean swap.
 */
export function SegmentedControl<T extends string>({ segments, value, onChange, style }: Props<T>) {
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            onPress={() => onChange(segment.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={
              segment.count === undefined ? segment.label : `${segment.label}, ${segment.count}`
            }
            style={[styles.segment, selected ? styles.selected : null]}
          >
            <AppText
              variant="caption"
              color={selected ? theme.content.primary : theme.content.tertiary}
              numberOfLines={1}
            >
              {segment.count === undefined ? segment.label : `${segment.label}  ${segment.count}`}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.md,
    backgroundColor: theme.background.inset,
    borderWidth: 1,
    borderColor: theme.border.hairline,
  },
  segment: {
    flex: 1,
    /*
     * 44, not 36.
     *
     * This was `minTouchTarget - space.sm` — a deliberate inset to keep the
     * thumb clear of the track's edge, which produced a 36pt row and put every
     * segmented control in the app under the 2.5.5 floor. MEASURED at 204x36
     * on the Trips screen, not inferred.
     *
     * The visual inset is preserved by padding the TRACK instead, so the
     * control looks the same and the target is real.
     */
    minHeight: minTouchTarget,
    paddingVertical: 9,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: theme.background.tertiary,
    shadowColor: elevation.card.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 2,
  },
});

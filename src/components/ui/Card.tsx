import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Surface } from './Surface';
import { space, theme } from '../../theme';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** `false` drops the shadow but keeps the fill, border and specular edge. */
  elevated?: boolean;
  /** The one card on a screen that outranks the others — a next-trip card, a reservation. */
  prominent?: boolean;
  /** Selected state in a choice of cards. */
  active?: boolean;
  /**
   * How selection is drawn. `border` recolours the existing 1px edge; `rail`
   * adds a 4px gold bar down the trailing edge, which is what the vehicle cards
   * use so a photo-led card doesn't get a gold outline round the image.
   */
  selection?: 'border' | 'rail';
  /** Removes the default padding — for cards whose children manage their own insets. */
  flush?: boolean;
  /**
   * Lays the children out in a row.
   *
   * ── Why this prop exists ────────────────────────────────────────────────
   * `style` lands on the SURFACE, and the children live in an inner padding
   * `View` — so `<Card style={{ flexDirection: 'row' }}>` sets the direction
   * on a container holding exactly one element and does nothing at all.
   *
   * That is not hypothetical. **Six screens shipped that way**: corporate-info,
   * airport, demo-account, and three account sub-pages all passed
   * `flexDirection: 'row'` through `style` and rendered stacked instead, with
   * the content sizing to itself and clipping against the Surface's
   * `overflow: hidden`. It typechecked, it linted, and it rendered without a
   * single error — found by looking at a screenshot.
   *
   * So the capability is a named prop rather than a trap. `alignItems` comes
   * with it because a row that needs one always needs the other.
   */
  row?: boolean;
  /** Cross-axis alignment for `row`. Defaults to centre, which is what most rows want. */
  align?: 'center' | 'flex-start';
}

/**
 * The default raised container.
 *
 * ── `active` never changes `borderWidth` ────────────────────────────────────
 * The previous Card went from `borderWidth: 1` to `1.5` on selection, which
 * moved its content by half a point on every side at the exact moment of the
 * tap — a visible 1.5-physical-pixel jitter on a 3× screen (audit P1-3). The
 * border width here is constant at 1 in every state; selection is carried by
 * colour, a halo, or a rail, none of which affect layout.
 */
export function Card({
  children,
  style,
  elevated = true,
  prominent = false,
  active = false,
  selection = 'border',
  flush = false,
  row = false,
  align = 'center',
}: Props) {
  const level = prominent ? 'cardProminent' : elevated ? 'card' : 'row';

  return (
    <Surface
      level={level}
      style={[
        !elevated ? styles.flat : null,
        active && selection === 'border' ? styles.activeBorder : null,
        style,
      ]}
    >
      {active && selection === 'rail' ? <View style={styles.rail} pointerEvents="none" /> : null}
      <View style={[flush ? null : styles.padding, row ? { flexDirection: 'row', alignItems: align } : null]}>
        {children}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  padding: { padding: space.md },
  flat: { shadowOpacity: 0, elevation: 0 },
  activeBorder: {
    // Colour only — the width is identical to the resting state.
    borderColor: theme.border.selected,
    shadowColor: theme.border.selected,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    // Logical property: mirrors correctly under RTL, unlike `right`.
    insetInlineEnd: 0,
    width: 4,
    backgroundColor: theme.border.selected,
  },
});

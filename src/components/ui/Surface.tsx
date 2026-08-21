import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { edgeHighlight, elevation, elevationRadius, radius } from '../../theme';

export type SurfaceLevel = keyof typeof elevation;

interface Props {
  children?: ReactNode;
  /** Which elevation recipe to render. Defaults to the standard card. */
  level?: Exclude<SurfaceLevel, 'accent'>;
  /** Overrides the radius paired with the level. */
  cornerRadius?: number;
  /** Turns off the specular top edge — only for surfaces that aren't lit from above (inset wells). */
  highlight?: boolean;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: ViewStyle['pointerEvents'];
}

/**
 * The elevation primitive. Every raised thing in the app is one of these, so no
 * screen has to remember the recipe.
 *
 * Depth on a near-black ground is four mechanisms stacked (see
 * src/theme/elevation.ts). Three of them are plain styles. The fourth — the 1px
 * specular catch along the top edge, which is what actually makes a card read as
 * a physical object rather than a slightly lighter rectangle — cannot be a style
 * at all: React Native has no inset box-shadow on either platform.
 *
 * It ships as a `LinearGradient` child rather than a 1px `View` for one reason:
 * a plain view with a border radius leaves visible square corners on the
 * highlight, while a gradient clipped by `overflow: hidden` follows the curve.
 * The gradient runs champagne-at-10% to fully transparent over exactly 1px,
 * which is a hard edge, not a fade — the height is what makes it a line.
 *
 * `pointerEvents="none"` on the overlay so it never eats a touch.
 */
export function Surface({
  children,
  level = 'card',
  cornerRadius,
  highlight = true,
  style,
  pointerEvents,
}: Props) {
  const corner = cornerRadius ?? elevationRadius[level] ?? radius.md;
  // An inset surface is recessed; a light source above would not catch its top edge.
  const showHighlight = highlight && level !== 'inset';

  return (
    <View
      style={[elevation[level], { borderRadius: corner, overflow: 'hidden' }, style]}
      pointerEvents={pointerEvents}
    >
      {showHighlight ? (
        <View style={styles.highlightLayer} pointerEvents="none">
          <LinearGradient colors={edgeHighlight.colors} style={styles.highlight} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  highlightLayer: { position: 'absolute', top: 0, left: 0, right: 0 },
  highlight: { height: edgeHighlight.height },
});

import { Image, type ImageContentFit, type ImageSource } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../../theme';

/**
 * THE ONE IMAGE COMPONENT.
 *
 * `expo-image` rather than React Native's `Image`, for three reasons that are
 * all about what the customer sees rather than about the library:
 *
 *   · a PLACEHOLDER, so a slot is never empty while a photo decodes;
 *   · a RESERVED BOX, so nothing on the screen moves when it arrives;
 *   · a cross-dissolve, so it does not pop.
 *
 * ── The reserved box is the point ───────────────────────────────────────────
 * Every caller must give this component a shape — an `aspectRatio` or an
 * explicit height. Without one, an image occupies zero height until it decodes
 * and then shoves everything below it down the screen. That is the single most
 * common cause of a customer tapping the wrong thing: the layout moved between
 * the decision and the tap.
 *
 * So `aspectRatio` is a required prop unless a height is passed in `style`. It
 * is cheap to satisfy and impossible to forget.
 *
 * ── The placeholder is a colour, not a blurhash ─────────────────────────────
 * A blurhash would be prettier and costs a string per image that somebody has
 * to generate and keep in sync with the asset. These are fixed local photos on
 * a near-black ground; the skeleton fill reads as "a photo is coming" and is
 * free. If remote imagery ever lands — an actual chauffeur avatar from a CDN —
 * a blurhash is worth revisiting for exactly those.
 */

interface Props {
  source: ImageSource | number;
  /**
   * Reserves the box before the image decodes. Required unless `style` sets an
   * explicit height — see the header for why this is not optional.
   */
  aspectRatio?: number;
  contentFit?: ImageContentFit;
  /** Wraps the image, so the reserved box can carry the placeholder fill. */
  style?: StyleProp<ViewStyle>;
  /** Decorative by default — a hero photo behind a headline announces nothing useful. */
  accessibilityLabel?: string;
  /** `high` for the one image a screen is built around. */
  priority?: 'low' | 'normal' | 'high';
  transitionMs?: number;
}

export function AppImage({
  source,
  aspectRatio,
  contentFit = 'cover',
  style,
  accessibilityLabel,
  priority = 'normal',
  transitionMs = 220,
}: Props) {
  return (
    <View style={[styles.frame, aspectRatio ? { aspectRatio } : null, style]}>
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        transition={transitionMs}
        priority={priority}
        // Local bundled assets, so memory alone is right: there is nothing to
        // re-fetch and a disk copy of a file already on disk is waste.
        cachePolicy="memory"
        // An image with no label is decorative and should be skipped, not
        // announced as "image". A caller that passes one means it.
        accessible={Boolean(accessibilityLabel)}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /*
   * The placeholder IS this fill. The image draws over it once decoded, and
   * because the frame already has the final shape nothing below it moves.
   */
  frame: { backgroundColor: theme.background.skeleton, overflow: 'hidden' },
});

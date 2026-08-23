import { StyleSheet, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { AppText } from '../ui/Typography';
import { iconSize, iconStroke, space, theme } from '../../theme';
import { distanceMiles } from '../../lib/geo';
import type { TrackingMapProps } from './TrackingMap';

/**
 * WEB — no map, and it says so.
 *
 * `react-native-maps` has no web implementation. The options were an embedded
 * Google Maps iframe, a second mapping library, or telling the truth. The first
 * two are a new dependency and a second map style to keep in sync for a
 * platform that is a preview of a native app; the third costs nothing and
 * misleads nobody.
 *
 * So this renders the same near-black ground as the native map, states plainly
 * that live tracking is a native feature, and — importantly — **still shows the
 * live data it does have.** The distance closing is real, computed from the
 * same smoothed position the marker would use, so a client watching the web
 * demo sees a number that genuinely moves rather than a static placeholder.
 * The screen degrades; it does not stop working.
 */
export function TrackingMap({ chauffeur, pickup, dropoff, phase }: TrackingMapProps) {
  const focus = phase === 'approach' ? pickup : dropoff;
  const milesAway = chauffeur && focus ? distanceMiles(chauffeur, focus) : null;

  return (
    <View style={styles.fill}>
      <View style={styles.centre}>
        <MapPin size={iconSize.lg} color={theme.content.tertiary} strokeWidth={iconStroke.decorative} />
        <AppText variant="caption" center style={styles.line}>
          The live map is available in the iOS and Android app.
        </AppText>
        {milesAway !== null ? (
          <AppText variant="subheading" center style={styles.distance} accessibilityLiveRegion="polite">
            {`${milesAway.toFixed(1)} mi ${phase === 'approach' ? 'away' : 'remaining'}`}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same ground as the native map's land colour, so the sheet floats over the
  // same tone on both platforms.
  fill: { ...StyleSheet.absoluteFill as object, backgroundColor: theme.background.primary },
  /*
   * Clears the sheet, which occupies the lower 62% of the screen.
   *
   * ── This was `flex: 1` + `paddingBottom: '58%'`, and it was wrong ─────────
   * A PERCENTAGE PADDING RESOLVES AGAINST THE CONTAINING BLOCK'S WIDTH — in
   * CSS and in React Native, for `paddingBottom` as much as for
   * `paddingHorizontal`. So "58%" was 58% of the viewport WIDTH, never its
   * height:
   *
   *     390 wide  → 226px padding   content lands at y=260   (looked correct)
   *    1440 wide  → 835px padding   content lands at y=-27   (above the fold)
   *
   * At 1440 that is 835px of padding inside an 846px-tall box: an 11px content
   * strip, the icon and the sentence pushed off the top of the screen, and the
   * region below reading as an empty rectangle on the one screen whose whole
   * purpose is watching a car approach.
   *
   * It survived because of a coincidence. The previous attempt was a flat
   * 220px, rejected as too small; 58% of a 390px phone is 226px — within six
   * pixels of the number that had just been discarded. It agreed with the
   * intended behaviour at exactly one width.
   *
   * ── Why `bottom` and not `paddingBottom` ─────────────────────────────────
   * On an ABSOLUTELY POSITIONED element, a percentage `bottom` resolves against
   * the containing block's HEIGHT, which is what was meant all along. Same
   * visual result on a phone, correct at every width.
   */
  centre: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '58%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  line: { marginTop: space.smd, maxWidth: 260 },
  distance: { marginTop: space.md },
});

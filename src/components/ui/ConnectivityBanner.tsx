import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { AppText } from './Typography';
import { iconSize, iconStroke, radius, space, theme } from '../../theme';

interface Props {
  /** When the shown data was last successfully fetched. Omitted if never. */
  lastSyncedLabel?: string | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * "You're offline" over cached content.
 *
 * Offline was a `✗` on every screen in the app — there was no connectivity
 * detection at all (audit P1-9). This is the presentation half; the store that
 * drives it lands in slice 12, on `expo-network`.
 *
 * Deliberately NOT an error treatment. Offline is not a failure, it is a
 * temporary condition with different recovery: the content on screen is still
 * true, it is just from a moment ago, which is why the banner says when.
 *
 * `accessibilityLiveRegion="polite"` so it is announced when it appears rather
 * than only when a user happens to swipe onto it — but polite, not assertive:
 * it should not interrupt whatever is being read.
 */
export function ConnectivityBanner({ lastSyncedLabel, style }: Props) {
  return (
    <View
      style={[styles.banner, style]}
      accessibilityLiveRegion="polite"
      accessible
      accessibilityRole="alert"
      accessibilityLabel={
        lastSyncedLabel
          ? `You're offline. Showing your last synced trips, from ${lastSyncedLabel}.`
          : "You're offline."
      }
    >
      <WifiOff size={iconSize.md} color={theme.content.accentEmphasis} strokeWidth={iconStroke.interactive} />
      <View style={styles.text}>
        <AppText variant="caption" color={theme.content.accentEmphasis}>
          You&apos;re offline
        </AppText>
        {lastSyncedLabel ? (
          <AppText variant="captionSm">{`Showing your last synced trips, from ${lastSyncedLabel}.`}</AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.smd,
    borderRadius: radius.sm,
    backgroundColor: theme.background.accentFaint,
    borderWidth: 1,
    borderColor: theme.border.accent,
  },
  text: { flex: 1, marginStart: 11 },
});

import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { Gallery } from '../../src/dev/Gallery';
import { theme } from '../../src/theme';

/**
 * The design-system gallery route. Development builds only.
 *
 * ── How "dev-only" is enforced, and its honest limit ────────────────────────
 * Expo Router excludes only `_layout` files and `+`-prefixed files from routing
 * — verified against the matcher in the installed expo-router@57.0.14, not
 * assumed. A leading underscore on a DIRECTORY is not excluded, so
 * `app/_dev/gallery.tsx` is a real route at `/_dev/gallery` in every build.
 *
 * So the guard is a runtime one: in production this renders a redirect and
 * nothing else. `__DEV__` is inlined as `false` by Metro in a production bundle,
 * which lets the gallery body dead-code-eliminate, but the module and this
 * file's imports still exist in the bundle graph.
 *
 * That is the ceiling available without a build-time route exclusion, which
 * SDK 57's public config does not expose. Nothing links here from navigation, so
 * it is unreachable in practice — but "unreachable" is not "absent", and it is
 * worth saying which one this is.
 */
export default function GalleryRoute() {
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Gallery />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background.primary },
});

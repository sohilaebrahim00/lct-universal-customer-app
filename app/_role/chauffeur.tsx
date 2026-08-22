import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { ChauffeurToday } from '../../src/dev/role/ChauffeurToday';
import { isDemoMode } from '../../src/lib/env';
import { theme } from '../../src/theme';

/**
 * ── How the role preview is fenced, and why it differs from the gallery ─────
 * The gallery next door guards on `__DEV__`. That is wrong here: the deployed
 * demo IS a production export, so `__DEV__` is false in exactly the build this
 * preview has to work in.
 *
 * So the guard is `isDemoMode`, and the build-time half is in metro.config.js,
 * which blocks all of `app/_dev/` EXCEPT `role/` in a production build, and
 * blocks `role/` too whenever the build is not a demo build. In the shipping
 * app these modules are absent from the bundle, not merely unreachable —
 * verified by grepping `dist/` for `ROLE_PREVIEW_MARKER`.
 *
 * The runtime redirect below is the belt to that braces: if the route is ever
 * reached in a non-demo build, it goes home rather than rendering.
 */
export default function ChauffeurRoute() {
  if (!isDemoMode) return <Redirect href="/" />;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ChauffeurToday />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background.primary },
});

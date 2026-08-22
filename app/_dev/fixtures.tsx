import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { FixtureHarness, FixtureHomeState } from '../../src/dev/FixtureHarness';
import { theme } from '../../src/theme';

/**
 * The fixture route. Development builds only.
 *
 * `?state=populated|loading|error|empty` renders one state full-bleed for a
 * clean screenshot; with no param you get the switcher.
 *
 * ── The fences ──────────────────────────────────────────────────────────────
 *  · `__DEV__` guard below — a production build renders a redirect, nothing else.
 *  · `metro.config.js` blocks `src/dev/` and `app/_dev/` from a production
 *    bundle entirely, so the fixture module is not merely unreachable but
 *    absent. Verified by grepping the exported bundle for
 *    `EXCLUSION_MARKER`; the result is in the slice report.
 *  · Nothing under `app/` links here.
 */
export default function FixturesRoute() {
  const { state } = useLocalSearchParams<{ state?: string }>();

  if (!__DEV__) return <Redirect href="/" />;

  const named = state === 'populated' || state === 'loading' || state === 'error' || state === 'empty';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {named ? <FixtureHomeState state={state} /> : <FixtureHarness />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background.primary },
});

import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { AdminConsole } from '../../src/dev/role/admin/AdminConsole';
import { isDemoMode } from '../../src/lib/env';
import { theme } from '../../src/theme';

/**
 * ADMIN CONSOLE — demo-mode only, behind two fences.
 *
 * `app/_role/` is stripped from a non-demo bundle by `resolver.blockList` in
 * `metro.config.js`, and `verify-build-mode.mjs` greps the emitted bundle to
 * prove the flag matches what was asked for. The runtime redirect below is the
 * second layer, and it is not redundant: Metro's transform cache does not key
 * on `EXPO_PUBLIC_*` values, so a stale inlined flag has already produced a
 * bundle whose route fence and runtime flag disagreed. Both layers, every time.
 *
 * See app/_role/chauffeur.tsx for the same pattern.
 */
export default function AdminRoute() {
  if (!isDemoMode) return <Redirect href="/" />;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AdminConsole />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background.primary },
});

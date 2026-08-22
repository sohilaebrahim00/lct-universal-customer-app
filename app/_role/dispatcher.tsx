import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { DispatcherBoard } from '../../src/dev/role/DispatcherBoard';
import { isDemoMode } from '../../src/lib/env';
import { theme } from '../../src/theme';

/** Demo-mode only. See app/_role/chauffeur.tsx for how the fence works. */
export default function DispatcherRoute() {
  if (!isDemoMode) return <Redirect href="/" />;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <DispatcherBoard />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background.primary },
});

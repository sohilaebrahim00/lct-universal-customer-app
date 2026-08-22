import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { DispatcherRide } from '../../src/dev/role/DispatcherRide';
import { isDemoMode } from '../../src/lib/env';
import { theme } from '../../src/theme';

/** Demo-mode only. See app/_role/chauffeur.tsx for how the fence works. */
export default function Route() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!isDemoMode) return <Redirect href="/" />;
  if (!id) return <Redirect href="/_role/dispatcher" />;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <DispatcherRide bookingId={id} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background.primary },
});

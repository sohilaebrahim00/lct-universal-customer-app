import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { ChauffeurStatus } from '../../src/dev/role/ChauffeurStatus';
import { isDemoMode } from '../../src/lib/env';
import { theme } from '../../src/theme';

/** Demo-mode only. See app/_role/chauffeur.tsx for how the fence works. */
export default function Route() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!isDemoMode) return <Redirect href="/" />;
  if (!id) return <Redirect href="/_role/chauffeur" />;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ChauffeurStatus bookingId={id} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background.primary },
});

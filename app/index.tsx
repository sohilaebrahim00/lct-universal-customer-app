import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../src/theme/tokens';
import { useAuthStore } from '../src/store/authStore';

export default function Index() {
  const status = useAuthStore((s) => s.status);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfaceBlack, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (status === 'signed-in') return <Redirect href="/(app)" />;
  return <Redirect href="/(auth)/login" />;
}

import { Redirect, Stack } from 'expo-router';
import { colors } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/store/authStore';

export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);

  if (status === 'signed-in') return <Redirect href="/(app)" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surfaceBlack } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}

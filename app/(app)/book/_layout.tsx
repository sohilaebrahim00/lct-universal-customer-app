import { Stack } from 'expo-router';
import { colors } from '../../../src/theme/tokens';

export default function BookLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surfaceBlack } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pickup" />
      <Stack.Screen name="destination" />
      <Stack.Screen name="vehicle" />
      <Stack.Screen name="details" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="confirmed" />
    </Stack>
  );
}

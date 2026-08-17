import { Stack } from 'expo-router';
import { colors } from '../../../src/theme/tokens';

export default function BookLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surfaceBlack } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pickup-dropoff" />
      <Stack.Screen name="datetime" />
      <Stack.Screen name="details" />
      <Stack.Screen name="vehicle" />
      <Stack.Screen name="review" />
      <Stack.Screen name="confirmed" />
    </Stack>
  );
}

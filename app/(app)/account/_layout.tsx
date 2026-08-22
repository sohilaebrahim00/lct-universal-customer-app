import { Stack } from 'expo-router';
import { theme } from '../../../src/theme';


/**
 * Without a layout file, Expo Router treats every file in this directory as a
 * route in the PARENT navigator — which is the tab bar. That is why the app was
 * rendering 14 tabs instead of 5: `account/settings`, `fleet/[id]`,
 * `trips/[id]` and six others each became their own tab, squeezing every label
 * down to 28pt and clipping it. `book/` already had this file, which is why it
 * was the only nested group behaving correctly.
 *
 * Pre-existing, not introduced by the redesign; found by reading the rendered
 * tab bar's DOM while screenshotting slice 1.
 */
export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background.primary },
      }}
    />
  );
}

import { Stack } from 'expo-router';
import { theme } from '../../src/theme';

/**
 * The role preview's own stack.
 *
 * Headerless: every screen draws its own title and its own disclosure line
 * through `RoleShell`, and a native header carrying the client app's styling
 * would undercut the point that these are different products.
 */
export default function RoleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background.primary },
      }}
    />
  );
}

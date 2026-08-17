import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { colors, fonts, fontSizes } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/store/authStore';
import { registerForPushNotifications } from '../../src/lib/pushNotifications';

export default function AppTabsLayout() {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === 'signed-in') void registerForPushNotifications();
  }, [status]);

  if (status === 'signed-out' || status === 'not-configured') return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.onyx, borderTopColor: colors.border, height: 84, paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: fontSizes.xs },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Book', tabBarIcon: ({ color, size }) => <Ionicons name="car-sport-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="trips"
        options={{ title: 'Trips', tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="concierge"
        options={{ title: 'Concierge', tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen name="book" options={{ href: null }} />
    </Tabs>
  );
}

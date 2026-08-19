import { useEffect } from 'react';
import { Home, Car, Map, Sparkles, User } from 'lucide-react-native';
import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';
import { colors, fonts, fontSizes } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/store/authStore';
import { registerForPushNotifications } from '../../src/lib/pushNotifications';
import { useNotificationRouter } from '../../src/lib/useNotificationRouter';
import { ConciergeFab } from '../../src/components/ConciergeFab';

export default function AppTabsLayout() {
  const status = useAuthStore((s) => s.status);
  const isGuest = useAuthStore((s) => s.isGuest);

  useEffect(() => {
    if (status === 'signed-in') void registerForPushNotifications();
  }, [status]);

  useNotificationRouter();

  // Guests get the full app shell — Home, Fleet, and browsing screens don't
  // need an account. Specific actions (booking confirmation, payment
  // methods, trip history, checkout) prompt for sign-in only when a guest
  // actually reaches them — see src/components/AuthGate.tsx.
  const canEnter = status === 'signed-in' || isGuest;
  if (!canEnter) return <Redirect href="/welcome" />;

  return (
    <View style={{ flex: 1 }}>
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
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={1.5} /> }}
      />
      <Tabs.Screen
        name="fleet"
        options={{ title: 'Fleet', tabBarIcon: ({ color, size }) => <Car size={size} color={color} strokeWidth={1.5} /> }}
      />
      <Tabs.Screen
        name="trips"
        options={{ title: 'Bookings', tabBarIcon: ({ color, size }) => <Map size={size} color={color} strokeWidth={1.5} /> }}
      />
      <Tabs.Screen
        name="concierge"
        options={{ title: 'Concierge', tabBarIcon: ({ color, size }) => <Sparkles size={size} color={color} strokeWidth={1.5} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={1.5} /> }}
      />
      <Tabs.Screen name="book" options={{ href: null }} />
      <Tabs.Screen name="about" options={{ href: null }} />
      <Tabs.Screen name="corporate-info" options={{ href: null }} />
      <Tabs.Screen name="demo-trip" options={{ href: null }} />
      <Tabs.Screen name="airport" options={{ href: null }} />
    </Tabs>
    <ConciergeFab />
    </View>
  );
}

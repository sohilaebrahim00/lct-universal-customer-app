import { useEffect } from 'react';
import { Home, Map, Sparkles, User } from 'lucide-react-native';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { iconStroke, resolveType, theme } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { registerForPushNotifications } from '../../src/lib/pushNotifications';
import { useNotificationRouter } from '../../src/lib/useNotificationRouter';

/** The bar's own height, above whatever the device reserves for its home indicator. */
const TAB_BAR_HEIGHT = 54;

export default function AppTabsLayout() {
  const status = useAuthStore((s) => s.status);
  const isGuest = useAuthStore((s) => s.isGuest);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (status === 'signed-in') void registerForPushNotifications();
  }, [status]);

  useNotificationRouter();

  // Guests get the full app shell — Home, Fleet and browsing screens don't need
  // an account. Specific actions prompt for sign-in when a guest reaches them.
  const canEnter = status === 'signed-in' || isGuest;
  if (!canEnter) return <Redirect href="/welcome" />;

  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;
  const tabLabelStyle = resolveType('tabLabel');

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.content.accent,
          tabBarInactiveTintColor: theme.content.tertiary,
          /*
           * Was a hardcoded `height: 84, paddingTop: 8` — an
           * iPhone-with-home-indicator number that was wrong on every
           * non-notched device and on most Android hardware (audit P2-6). The
           * bar is now its own 54pt plus whatever the device actually reserves.
           *
           * The design specifies an `expo-blur` BlurView behind this fill.
           * expo-blur is approved only conditionally, pending an Android
           * release-build frame-cost measurement that cannot be run in this
           * environment — a tab bar composites on every frame of every scroll,
           * so that measurement is the whole decision. Shipping the flat fill
           * the blur would sit behind; adding BlurView later is additive and
           * changes nothing else here.
           */
          tabBarStyle: {
            height: tabBarHeight,
            // React Navigation's web tab bar derives its own height and was
            // clamping the bar to 42pt, which collapsed the label box to 0 and
            // clipped every label. minHeight is what it actually honours.
            minHeight: tabBarHeight,
            // 6, not 8: React Navigation clamps the web bar to ~45pt, and
            // 8 + 20 (icon) + 4 (gap) + 14 (label) = 46 clipped the descenders
            // on "Trips" and "Concierge" by a pixel.
            paddingTop: 6,
            paddingBottom: insets.bottom,
            backgroundColor: theme.background.tertiary,
            borderTopColor: theme.border.hairline,
            borderTopWidth: StyleSheet.hairlineWidth,
          },
          tabBarLabelStyle: {
            fontFamily: tabLabelStyle.fontFamily,
            fontSize: tabLabelStyle.fontSize,
            // Without an explicit lineHeight the label's box measured 0pt high
            // on web and vanished. This is the same "every type role ships a
            // line height" rule the type scale enforces — the tab bar reaches
            // past AppText into a raw style object, so it has to restate it.
            lineHeight: tabLabelStyle.lineHeight,
            letterSpacing: tabLabelStyle.letterSpacing,
            marginTop: 3,
          },
          tabBarIconStyle: { marginTop: 0, height: 20 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Home size={20} color={color} strokeWidth={iconStroke.interactive} />,
          }}
        />
        <Tabs.Screen
          name="trips"
          options={{
            title: 'Trips',
            tabBarIcon: ({ color }) => <Map size={20} color={color} strokeWidth={iconStroke.interactive} />,
          }}
        />
        <Tabs.Screen
          name="concierge"
          options={{
            title: 'Concierge',
            tabBarIcon: ({ color }) => <Sparkles size={20} color={color} strokeWidth={iconStroke.interactive} />,
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: 'Account',
            tabBarIcon: ({ color }) => <User size={20} color={color} strokeWidth={iconStroke.interactive} />,
          }}
        />
        {/*
          Four tabs. Fleet is a ROUTE, not a tab.
          A tab is the most expensive real estate in the app, and spending one on
          relocated marketing contradicts the thesis — the structural advantage
          over Uber is that this app opens straight into a ride rather than
          carrying four verticals. The fleet is decision-relevant on the vehicle
          step, which already shows the real photography at the moment it
          matters, and browsable from the "Our fleet" row in Account.

          `href: null` rather than deleting the folder, so `fleet/_layout.tsx`
          stays and the 14-tab bug (every file in a layout-less directory
          becoming its own tab) cannot come back.
        */}
        <Tabs.Screen name="fleet" options={{ href: null }} />
        <Tabs.Screen name="book" options={{ href: null }} />
        <Tabs.Screen name="about" options={{ href: null }} />
        <Tabs.Screen name="corporate-info" options={{ href: null }} />
        <Tabs.Screen name="demo-trip" options={{ href: null }} />
        <Tabs.Screen name="airport" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background.primary },
});

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { theme } from '../theme';

/**
 * Shown while fonts and the Supabase session are still resolving, before
 * AppText's custom font families are guaranteed loaded — deliberately uses
 * plain React Native <Text>/system font rather than AppText, so there's no
 * flash of the wrong typeface once the real fonts come in.
 */
export function AppLoadingScreen() {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    scale.value = withSequence(
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
      withRepeat(withTiming(1.03, { duration: 1400, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../../assets/brand/lct-logo.png')}
        style={[styles.logo, animatedStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background.primary, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 160, height: 110 },
});

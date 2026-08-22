import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Circle, MapPin, Car } from 'lucide-react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { radius, space, theme } from '../../theme';

const MARKER_SIZE = 30;

export function AnimatedRoutePreview() {
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue(0);
  const glow = useSharedValue(0.6);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.ease) }), -1, true);
    glow.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [0, Math.max(trackWidth - MARKER_SIZE, 0)]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0.6, 1], [0.4, 0.9]),
    transform: [{ scale: interpolate(glow.value, [0.6, 1], [0.85, 1.15]) }],
  }));

  function onTrackLayout(e: LayoutChangeEvent) {
    setTrackWidth(e.nativeEvent.layout.width);
  }

  return (
    <View style={styles.container}>
      <View style={styles.pinRow}>
        <View style={styles.pinLabel}>
          <Circle size={10} color={theme.content.accent} strokeWidth={1.5} fill={theme.content.accent} />
        </View>
        <View style={styles.pinLabel}>
          <Animated.View style={[styles.destinationGlow, glowStyle]} />
          <MapPin size={16} color={theme.content.accent} strokeWidth={1.5} />
        </View>
      </View>

      <View style={styles.track} onLayout={onTrackLayout}>
        <View style={styles.routeLine} />
        {trackWidth > 0 ? (
          <Animated.View style={[styles.marker, markerStyle]}>
            <Car size={16} color={theme.background.primary} strokeWidth={1.5} />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', height: 200, padding: space.lg, justifyContent: 'center', backgroundColor: theme.background.tertiary },
  pinRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.md },
  pinLabel: { alignItems: 'center', justifyContent: 'center' },
  destinationGlow: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: 'rgba(217,177,96,0.35)',
  },
  track: { justifyContent: 'center' },
  routeLine: { height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: theme.border.hairline },
  marker: {
    position: 'absolute',
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: radius.full,
    backgroundColor: theme.content.accent,
    alignItems: 'center',
    justifyContent: 'center',
    top: -(MARKER_SIZE / 2),
  },
});

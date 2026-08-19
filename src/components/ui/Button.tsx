import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, fontSizes, radius, shadows, spacing } from '../../theme/tokens';
import { AppText } from './Typography';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({ label, onPress, variant = 'primary', disabled, loading, style, testID }: Props) {
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' ? colors.surfaceBlack : colors.gold} />
  ) : (
    <AppText style={[styles.label, labelColor[variant]]}>{label}</AppText>
  );

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      // Reanimated's SharedValue.value is an intentional mutable worklet-owned cell, not React render state — it's
      // Reanimated's own documented API, handled by its own Babel plugin outside React's normal render model. The
      // React Compiler lint rule doesn't know that, hence the two disables below.
      onPressIn={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withSpring(0.96, { damping: 16, stiffness: 260 });
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withSpring(1, { damping: 14, stiffness: 220 });
      }}
      style={[
        styles.base,
        variant !== 'primary' ? variantStyles[variant] : null,
        variant === 'primary' && !isDisabled ? shadows.gold : null,
        isDisabled ? styles.disabled : null,
        animatedStyle,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[colors.goldSoft, colors.gold, colors.goldDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, styles.gradientFill]}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  gradientFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 0,
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSizes.base,
    letterSpacing: 0.6,
  },
  disabled: { opacity: 0.45 },
});

const variantStyles = StyleSheet.create({
  primary: {},
  secondary: { backgroundColor: colors.charcoal, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.gold },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.destructive },
});

const labelColor = StyleSheet.create({
  primary: { color: colors.surfaceBlack },
  secondary: { color: colors.offWhite },
  ghost: { color: colors.gold },
  danger: { color: colors.destructive },
});

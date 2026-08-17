import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
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

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 16, stiffness: 260 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 220 });
      }}
      style={[
        styles.base,
        variantStyles[variant],
        variant === 'primary' && !isDisabled ? shadows.gold : null,
        isDisabled ? styles.disabled : null,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.surfaceBlack : colors.gold} />
      ) : (
        <AppText style={[styles.label, labelColor[variant]]}>{label}</AppText>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSizes.base,
    letterSpacing: 0.4,
  },
  disabled: { opacity: 0.45 },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.gold },
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

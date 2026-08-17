import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
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

export function Button({ label, onPress, variant = 'primary', disabled, loading, style, testID }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        variant === 'primary' && !isDisabled ? shadows.gold : null,
        isDisabled ? styles.disabled : null,
        pressed && !isDisabled ? styles.pressed : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.surfaceBlack : colors.gold} />
      ) : (
        <AppText style={[styles.label, labelColor[variant]]}>{label}</AppText>
      )}
    </Pressable>
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
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
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

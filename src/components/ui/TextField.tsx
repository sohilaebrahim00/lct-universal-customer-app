import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, fontSizes, radius, spacing } from '../../theme/tokens';
import { AppText } from './Typography';

interface Props extends TextInputProps {
  label: string;
  error?: string | null;
}

export function TextField({ label, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color={colors.destructive} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.onyx,
    color: colors.offWhite,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
  },
  inputError: { borderColor: colors.destructive },
  error: { marginTop: spacing.xs },
});

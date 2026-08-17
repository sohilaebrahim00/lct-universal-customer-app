import { StyleSheet, Text, type TextProps } from 'react-native';
import { colors, fonts, fontSizes } from '../../theme/tokens';

type Variant = 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyMuted' | 'caption' | 'eyebrow';

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

const variantStyles = StyleSheet.create({
  display: { fontFamily: fonts.displayBold, fontSize: fontSizes.display, color: colors.offWhite, lineHeight: fontSizes.display * 1.08 },
  title: { fontFamily: fonts.display, fontSize: fontSizes.xxl, color: colors.offWhite, lineHeight: fontSizes.xxl * 1.15 },
  heading: { fontFamily: fonts.display, fontSize: fontSizes.xl, color: colors.offWhite, lineHeight: fontSizes.xl * 1.2 },
  subheading: { fontFamily: fonts.sansSemiBold, fontSize: fontSizes.md, color: colors.offWhite },
  body: { fontFamily: fonts.sans, fontSize: fontSizes.base, color: colors.offWhite, lineHeight: fontSizes.base * 1.5 },
  bodyMuted: { fontFamily: fonts.sans, fontSize: fontSizes.base, color: colors.mutedForeground, lineHeight: fontSizes.base * 1.5 },
  caption: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.mutedForeground },
  eyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSizes.xs,
    color: colors.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

export function AppText({ variant = 'body', color, center, style, ...rest }: Props) {
  return (
    <Text
      style={[variantStyles[variant], color ? { color } : null, center ? { textAlign: 'center' } : null, style]}
      {...rest}
    />
  );
}

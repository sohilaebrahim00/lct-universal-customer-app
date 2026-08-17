import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme/tokens';

/** The site's recurring "self-drawing gold line" motif, simplified to a static gradient-free rule for native. */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.line, style]} />;
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.gold,
    opacity: 0.5,
    marginVertical: spacing.md,
  },
});

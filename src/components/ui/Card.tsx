import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing } from '../../theme/tokens';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  /** Gold border + subtle glow — the selected state in a choice of cards (service, vehicle, ...). */
  active?: boolean;
}

export function Card({ children, style, elevated = true, active = false }: Props) {
  return (
    <View style={[styles.card, elevated ? shadows.card : null, active ? styles.active : null, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.onyx,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  active: {
    borderColor: colors.gold,
    borderWidth: 1.5,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
});

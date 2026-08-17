import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './Typography';
import { colors, spacing } from '../../theme/tokens';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: ReactNode;
}

/** Reusable empty-state block: icon, title, optional message and CTA, always centered. */
export function EmptyState({ icon, title, message, action }: Props) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg }}>
      <Ionicons name={icon} size={28} color={colors.mutedForeground} style={{ marginBottom: spacing.sm }} />
      <AppText variant="subheading" center style={{ marginBottom: message ? spacing.xs : 0 }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="bodyMuted" center style={{ marginBottom: action ? spacing.md : 0 }}>
          {message}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './Typography';
import { colors, spacing } from '../../theme/tokens';

interface Props {
  icon: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
}

/** Reusable empty-state block: icon, title, optional message and CTA, always centered. */
export function EmptyState({ icon: Icon, title, message, action }: Props) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg }}>
      <Icon size={28} color={colors.mutedForeground} strokeWidth={1.5} style={{ marginBottom: spacing.sm }} />
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

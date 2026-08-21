import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AlertTriangle, type LucideIcon } from 'lucide-react-native';
import { AppText } from './Typography';
import { Button } from './Button';
import { colors, spacing } from '../../theme/tokens';

interface Props {
  icon?: LucideIcon;
  title?: string;
  message?: string;
  onRetry?: () => void;
  action?: ReactNode;
}

/** Reusable error/failure block: icon, title, optional message, and a retry action — the ErrorState sibling to EmptyState. */
export function ErrorState({
  icon: Icon = AlertTriangle,
  title = 'Something went wrong',
  message,
  onRetry,
  action,
}: Props) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg }}>
      <Icon size={28} color={colors.destructive} strokeWidth={1.5} style={{ marginBottom: spacing.sm }} />
      <AppText variant="subheading" center style={{ marginBottom: message ? spacing.xs : 0 }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="bodyMuted" center style={{ marginBottom: action || onRetry ? spacing.md : 0 }}>
          {message}
        </AppText>
      ) : null}
      {action ?? (onRetry ? <Button label="Try Again" variant="ghost" onPress={onRetry} /> : null)}
    </View>
  );
}

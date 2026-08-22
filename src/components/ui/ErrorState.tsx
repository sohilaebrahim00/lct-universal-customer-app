import type { ReactNode } from 'react';
import { Linking, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AlertTriangle, type LucideIcon } from 'lucide-react-native';
import { AppText } from './Typography';
import { Button } from './Button';
import { iconSize, iconStroke, radius, space, theme } from '../../theme';
import { servicePolicy } from '../../config/servicePolicy';

interface Props {
  icon?: LucideIcon;
  title?: string;
  message?: string;
  onRetry?: () => void;
  /** Replaces the default action row entirely. */
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Something went wrong on our side.
 *
 * ── The phone number is the point ───────────────────────────────────────────
 * A customer whose car arrives in twenty minutes needs a human, not a retry
 * button. So "Call dispatch" sits beside "Try again" whenever a number exists.
 *
 * It renders ONLY when `servicePolicy.dispatchPhone` is set. That value is null
 * and is a blocked business input — printing a plausible number here would be
 * inventing a support channel, and a customer dialling it would reach nobody.
 * When null the row is just "Try again", which is what it is today.
 */
export function ErrorState({
  icon: Icon = AlertTriangle,
  title = 'Something went wrong',
  message,
  onRetry,
  action,
  style,
}: Props) {
  const phone = servicePolicy.dispatchPhone;

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconWrap}>
        <Icon size={iconSize.lg} color={theme.content.danger} strokeWidth={iconStroke.interactive} />
      </View>
      <AppText variant="heading" center style={styles.title}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color={theme.content.secondary} center style={styles.message}>
          {message}
        </AppText>
      ) : null}

      {action ?? (
        <View style={styles.actions}>
          {onRetry ? <Button label="Try again" size="md" onPress={onRetry} style={styles.action} /> : null}
          {phone ? (
            <Button
              label="Call dispatch"
              variant="secondary"
              size="md"
              onPress={() => void Linking.openURL(`tel:${phone}`)}
              style={styles.action}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: space.xl, paddingHorizontal: space.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: theme.background.dangerTint,
    borderWidth: 1,
    borderColor: theme.border.dangerTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  title: { marginBottom: space.sm },
  message: { maxWidth: 280 },
  actions: { flexDirection: 'row', gap: 9, marginTop: space.md, alignSelf: 'stretch' },
  action: { flex: 1 },
});

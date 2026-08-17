import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable } from 'react-native';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, spacing } from '../../../src/theme/tokens';
import { notificationsApi } from '../../../src/api/notifications';
import type { AppNotification } from '../../../src/types/api';
import { formatDateTime } from '../../../src/lib/format';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const load = useCallback(() => {
    notificationsApi.list().then(setNotifications).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handlePress(notification: AppNotification) {
    if (!notification.read_at) {
      await notificationsApi.markRead(notification.id);
      load();
    }
  }

  return (
    <ScreenContainer>
      <AppText variant="title" style={{ marginBottom: spacing.lg }}>
        Notifications
      </AppText>

      {notifications.length === 0 ? <AppText variant="bodyMuted">You&apos;re all caught up.</AppText> : null}

      {notifications.map((n) => (
        <Pressable key={n.id} onPress={() => handlePress(n)}>
          <Card style={{ marginBottom: spacing.sm, opacity: n.read_at ? 0.6 : 1 }}>
            <AppText variant="subheading">{n.title}</AppText>
            <AppText variant="bodyMuted" style={{ marginVertical: spacing.xs }}>
              {n.body}
            </AppText>
            <AppText variant="caption" color={colors.mutedForeground}>
              {formatDateTime(n.created_at)}
            </AppText>
          </Card>
        </Pressable>
      ))}
    </ScreenContainer>
  );
}

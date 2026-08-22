import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable } from 'react-native';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { AppText } from '../../../src/components/ui/Typography';

import { notificationsApi } from '../../../src/api/notifications';
import type { AppNotification } from '../../../src/types/api';
import { formatDateTime } from '../../../src/lib/format';
import { space, theme } from '../../../src/theme';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const load = useCallback(() => {
    notificationsApi.list()
      .then(setNotifications).catch((cause: unknown) =>
      // Was `.catch(() => {})`: a failed read rendered as an empty list, which
      // tells the customer they have nothing rather than that we could not ask.
      setLoadError(cause instanceof Error ? cause : new Error(String(cause))),
    );
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
      {loadError ? (
        <ErrorState title="We couldn't load your notifications" message="This is our end, not yours." onRetry={load} />
      ) : null}
      <AppText variant="title" style={{ marginBottom: space.lg }}>
        Notifications
      </AppText>

      {notifications.length === 0 ? <AppText variant="bodyMuted">You&apos;re all caught up.</AppText> : null}

      {notifications.map((n) => (
        <Pressable key={n.id} onPress={() => handlePress(n)}>
          <Card style={{ marginBottom: space.sm, opacity: n.read_at ? 0.6 : 1 }}>
            <AppText variant="subheading">{n.title}</AppText>
            <AppText variant="bodyMuted" style={{ marginVertical: space.xs }}>
              {n.body}
            </AppText>
            <AppText variant="caption" color={theme.content.secondary}>
              {formatDateTime(n.created_at)}
            </AppText>
          </Card>
        </Pressable>
      ))}
    </ScreenContainer>
  );
}

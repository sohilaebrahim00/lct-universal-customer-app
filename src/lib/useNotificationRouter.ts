import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

/**
 * Deep-links a tapped push notification to the relevant trip. The backend
 * includes `bookingId` in every trip-related notification's data payload
 * (see lct-universal-backend/src/modules/notifications/service.ts and every
 * notifyProfile(...) call site) — this is the client-side half of that
 * contract. Foreground banners are handled separately by the OS via the
 * `shouldShowBanner: true` handler registered in pushNotifications.ts, so
 * this hook only needs to cover the "user tapped it" case.
 */
export function useNotificationRouter(): void {
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { bookingId?: string } | undefined;
      if (data?.bookingId) router.push(`/(app)/trips/${data.bookingId}`);
    });

    return () => subscription.remove();
  }, [router]);
}

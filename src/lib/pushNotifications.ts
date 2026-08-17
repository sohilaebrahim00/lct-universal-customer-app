import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { notificationsApi } from '../api/notifications';
import { isExpoGo } from './expoEnvironment';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests notification permission and registers this device's native push
 * token (APNs on iOS, FCM on Android) with the backend's
 * POST /notifications/push-tokens. The backend's Firebase Cloud Messaging
 * integration sends to these tokens directly — for iOS, that additionally
 * requires the backend's Firebase project to have an APNs auth key
 * uploaded in the Firebase console (a one-time setup step on the Firebase
 * side, not something this app or the backend code controls). Physical
 * device push delivery has not been verified in this environment — see
 * README.
 */
export async function registerForPushNotifications(): Promise<{ registered: boolean; reason?: string }> {
  if (!Device.isDevice) {
    return { registered: false, reason: 'Push notifications require a physical device (not a simulator).' };
  }

  // Expo Go can request permission and show local notifications, but
  // remote push token registration (getDevicePushTokenAsync) isn't
  // supported there for this project's setup — skip cleanly with a clear
  // reason instead of letting it fail unpredictably. Development-client
  // and production builds are unaffected.
  if (isExpoGo) {
    return { registered: false, reason: 'Push notifications require the LCT Universal development client or a production build — not available in Expo Go.' };
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return { registered: false, reason: 'Notification permission was not granted.' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#d9b160',
    });
  }

  const { data: token } = await Notifications.getDevicePushTokenAsync();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  try {
    await notificationsApi.registerPushToken(token, platform);
    return { registered: true };
  } catch (err) {
    return { registered: false, reason: err instanceof Error ? err.message : 'Failed to register push token' };
  }
}

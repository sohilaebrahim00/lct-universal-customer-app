import { api } from '../lib/apiClient';
import type { AppNotification } from '../types/api';

export const notificationsApi = {
  list: () => api.get<{ notifications: AppNotification[] }>('/notifications').then((r) => r.notifications),
  markRead: (id: string) => api.patch<{ notification: AppNotification }>(`/notifications/${id}/read`),
  registerPushToken: (token: string, platform: 'ios' | 'android') =>
    api.post('/notifications/push-tokens', { token, platform }),
  removePushToken: (token: string) => api.delete(`/notifications/push-tokens/${encodeURIComponent(token)}`),
};

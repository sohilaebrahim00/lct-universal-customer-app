import { api } from '../lib/apiClient';
import type { ParsedBookingIntent } from '../types/api';

export interface ConciergeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const conciergeApi = {
  config: () => api.get<{ configured: boolean }>('/concierge/config'),
  send: (messages: ConciergeMessage[]) =>
    api.post<{ intent: ParsedBookingIntent }>('/concierge/message', { messages }).then((r) => r.intent),
};

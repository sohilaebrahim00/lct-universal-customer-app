import type { Ionicons } from '@expo/vector-icons';
import type { ServiceType } from '../types/api';

export interface ServiceMeta {
  type: ServiceType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const SERVICES: ServiceMeta[] = [
  { type: 'airport', label: 'Airport', description: 'Flight-tracked pickups and drop-offs', icon: 'airplane-outline' },
  { type: 'corporate', label: 'Corporate', description: 'Business travel for your company', icon: 'briefcase-outline' },
  { type: 'events', label: 'Events', description: 'Weddings, galas, and special occasions', icon: 'sparkles-outline' },
  { type: 'point_to_point', label: 'Point to Point', description: 'A single pickup and drop-off', icon: 'navigate-outline' },
  { type: 'hourly', label: 'Hourly Chauffeur', description: 'A dedicated vehicle by the hour', icon: 'time-outline' },
  { type: 'custom', label: 'Custom Request', description: 'Tell us what you need', icon: 'create-outline' },
];

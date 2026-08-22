import type { ServiceType } from '../types/api';

export interface ServiceMeta {
  type: ServiceType;
  label: string;
  description: string;
  /** Lucide icon component name — see app/(app)/book/index.tsx for the mapping to the actual component. */
  icon: 'plane' | 'briefcase' | 'sparkles' | 'navigation' | 'clock' | 'pen';
  image: ReturnType<typeof require>;
}

export const SERVICES: ServiceMeta[] = [
  {
    type: 'airport',
    label: 'Airport Transfer',
    description: 'Flight-tracked pickups and drop-offs, curb to gate.',
    icon: 'plane',
    image: require('../../assets/services/airport.jpg'),
  },
  {
    type: 'corporate',
    label: 'Corporate Travel',
    description: 'Executive transportation solutions for your company.',
    icon: 'briefcase',
    image: require('../../assets/services/corporate.jpg'),
  },
  {
    type: 'events',
    label: 'Special Occasions',
    description: 'Weddings, galas, and premium event transportation.',
    icon: 'sparkles',
    image: require('../../assets/services/events.jpg'),
  },
  {
    type: 'point_to_point',
    label: 'Point to Point',
    description: 'A single private pickup and drop-off, door to door.',
    icon: 'navigation',
    image: require('../../assets/services/point-to-point.jpg'),
  },
  {
    type: 'hourly',
    label: 'Hourly Chauffeur',
    description: 'A dedicated vehicle and chauffeur, by the hour.',
    icon: 'clock',
    image: require('../../assets/services/hourly.jpg'),
  },
  {
    type: 'custom',
    label: 'Custom Request',
    description: 'Tell us what you need — we will arrange it.',
    icon: 'pen',
    image: require('../../assets/services/custom.jpg'),
  },
];

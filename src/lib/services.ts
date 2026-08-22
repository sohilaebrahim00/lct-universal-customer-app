import type { ServiceType } from '../types/api';

export interface ServiceMeta {
  type: ServiceType;
  label: string;
  description: string;
  /** Lucide icon component name — see app/(app)/book/index.tsx for the mapping to the actual component. */
  icon: 'plane' | 'briefcase' | 'sparkles' | 'navigation' | 'clock' | 'pen';
  /**
   * The service photo, resolved ON FIRST READ rather than at module load.
   *
   * A getter, not a value. `SERVICES` is imported by the booking entry screen
   * and by Home's service tiles, so a plain `require()` here pulled all six
   * photos into the bundle graph the moment either screen was reached —
   * 2.1 MB of JPEG before the downscale, decoded whether or not the customer
   * ever opened the picker.
   *
   * Metro still resolves the paths statically, so the ASSETS ship either way;
   * what the getter buys is that they are not read, decoded or held in memory
   * until something actually renders one. Combined with the downscale
   * (2.1 MB → 796 KB) that is the whole of this optimisation, and the honest
   * limit of it: this does not remove bytes from the download, it removes work
   * and memory from the path a customer takes.
   */
  readonly image: number;
}

export const SERVICES: ServiceMeta[] = [
  {
    type: 'airport',
    label: 'Airport Transfer',
    description: 'Flight-tracked pickups and drop-offs, curb to gate.',
    icon: 'plane',
    get image() {
      return require('../../assets/services/airport.jpg') as number;
    },
  },
  {
    type: 'corporate',
    label: 'Corporate Travel',
    description: 'Executive transportation solutions for your company.',
    icon: 'briefcase',
    get image() {
      return require('../../assets/services/corporate.jpg') as number;
    },
  },
  {
    type: 'events',
    label: 'Special Occasions',
    description: 'Weddings, galas, and premium event transportation.',
    icon: 'sparkles',
    get image() {
      return require('../../assets/services/events.jpg') as number;
    },
  },
  {
    type: 'point_to_point',
    label: 'Point to Point',
    description: 'A single private pickup and drop-off, door to door.',
    icon: 'navigation',
    get image() {
      return require('../../assets/services/point-to-point.jpg') as number;
    },
  },
  {
    type: 'hourly',
    label: 'Hourly Chauffeur',
    description: 'A dedicated vehicle and chauffeur, by the hour.',
    icon: 'clock',
    get image() {
      return require('../../assets/services/hourly.jpg') as number;
    },
  },
  {
    type: 'custom',
    label: 'Custom Request',
    description: 'Tell us what you need — we will arrange it.',
    icon: 'pen',
    get image() {
      return require('../../assets/services/custom.jpg') as number;
    },
  },
];

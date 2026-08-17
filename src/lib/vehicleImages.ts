import type { ImageSourcePropType } from 'react-native';
import type { VehicleType } from '../types/api';

// Real LCT Universal fleet photography, copied from the website's asset
// library (LCT-Universal-Vite-Ready-v2/public/assets) — not stock/placeholder
// images. Metro requires static string literals for require(), so this is a
// literal map rather than a computed path.
export const VEHICLE_IMAGES: Record<VehicleType, ImageSourcePropType> = {
  executive_sedan: require('../../assets/vehicles/executive-sedan.jpg'),
  suv: require('../../assets/vehicles/luxury-suv.jpg'),
  sprinter: require('../../assets/vehicles/sprinter.jpg'),
  coach: require('../../assets/vehicles/coach.jpg'),
};

export const VEHICLE_DISPLAY_NAME: Record<VehicleType, string> = {
  executive_sedan: 'Executive Sedan',
  suv: 'Luxury SUV',
  sprinter: 'Mercedes Sprinter',
  coach: 'Coach',
};

import type { VehicleType } from '../types/api';

export const VEHICLE_TAGLINE: Record<VehicleType, string> = {
  executive_sedan: 'Refined, discreet travel for the business traveler.',
  suv: 'Commanding presence with room for the whole party.',
  sprinter: 'Group travel without compromising on comfort.',
  coach: 'Full-scale event and group transportation.',
};

export const VEHICLE_FEATURES: Record<VehicleType, string[]> = {
  executive_sedan: [
    'Leather captain seating',
    'Complimentary bottled water',
    'Wi-Fi on board',
    'Climate-controlled cabin',
    'Phone charging ports',
    'Privacy glass',
  ],
  suv: [
    'Leather captain seating',
    'Complimentary bottled water',
    'Wi-Fi on board',
    'Climate-controlled cabin',
    'Phone charging ports',
    'Extended cargo space',
  ],
  sprinter: [
    'Forward-facing group seating',
    'Complimentary bottled water',
    'Wi-Fi on board',
    'Climate-controlled cabin',
    'Phone charging ports',
    'Onboard luggage bay',
  ],
  coach: [
    'Tiered group seating',
    'Complimentary bottled water',
    'Wi-Fi on board',
    'PA system',
    'Onboard restroom',
    'Large luggage bay',
  ],
};

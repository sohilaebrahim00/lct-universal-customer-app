import { ref } from '../../theme/mapPalette';

/**
 * The warm near-black map style.
 *
 * Google Maps' own dark theme is a cool blue-grey. Dropped into this app it
 * reads as a Google product embedded in an LCT screen — the one place in the
 * product where a customer would notice the seam, because the map fills the
 * whole display.
 *
 * So the palette is the app's: `background.primary` for land, the same
 * champagne for the roads the eye is meant to follow, and every point of
 * interest turned off. A tracking screen is not a place to browse restaurants,
 * and each unnecessary label competes with the one moving thing that matters.
 *
 * Format is Google's `MapTypeStyle[]`, passed to `customMapStyle` on both
 * platforms. **iOS ignores it unless the Google provider is selected**, which
 * this app does not do — recorded as a known limitation rather than worked
 * around, because switching iOS to Google Maps is a product decision with
 * licensing attached, not a styling one. On Apple Maps the tracking screen
 * renders in Apple's own dark mode, which is at least dark.
 */
export const MAP_STYLE_NIGHT = [
  { elementType: 'geometry', stylers: [{ color: ref.land }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: ref.label }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: ref.land }] },

  // Points of interest, all of them, off.
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: ref.admin }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },

  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: ref.surface }] },

  // Roads, in three weights. The route is the subject, so arterials carry the
  // accent and everything below them recedes.
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: ref.road }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: ref.roadLabel }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: ref.roadLocal }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: ref.roadArterial }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: ref.roadHighway }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: ref.roadLabel }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: ref.water }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: ref.waterLabel }] },
];

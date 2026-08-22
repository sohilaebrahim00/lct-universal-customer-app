import { useRouter } from 'expo-router';
import { LocationPickerScreen } from '../../../src/components/maps/LocationPickerScreen';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { getRoute } from '../../../src/lib/googlePlaces';

export default function DestinationStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const update = useBookingFormStore((s) => s.update);

  return (
    <LocationPickerScreen
      title="Drop-off Location"
      subtitle="Search for a destination"
      bias={draft.pickupLat && draft.pickupLng ? { lat: draft.pickupLat, lng: draft.pickupLng } : undefined}
      /*
       * The pickup, so the map draws the route to it and frames BOTH ends with
       * fitToCoordinates. Null when the pickup came through manual entry, which
       * reports no coordinates — the screen then behaves exactly as the pickup
       * screen does, which is the correct degradation rather than a broken map.
       */
      origin={
        draft.pickupLat && draft.pickupLng
          ? { latitude: draft.pickupLat, longitude: draft.pickupLng }
          : null
      }
      confirmLabel="Confirm destination"
      onConfirm={async (result) => {
        update({ dropoffAddress: result.address, dropoffLat: result.lat || undefined, dropoffLng: result.lng || undefined });

        /*
         * The manual-entry fallback (no Maps key, Expo Go, or web) reports
         * lat/lng as 0, so the old truthiness guard skipped the route lookup
         * entirely — leaving distanceMiles null and every fare priced on base
         * rate alone. getRoute() returns null on its own when Maps is
         * unconfigured, so calling it unconditionally is safe and is what lets
         * demo mode supply the seeded reference distance.
         */
        {
          const route = await getRoute(
            { lat: draft.pickupLat ?? 0, lng: draft.pickupLng ?? 0 },
            { lat: result.lat, lng: result.lng },
          );
          if (route) {
            update({
              distanceMiles: Math.round(route.distanceMiles * 10) / 10,
              durationMinutes: Math.round(route.durationMinutes),
              routePolyline: route.polyline,
            });
          }
        }

        // THE REORDER: date and time are collected before the car, so the fare
        // quoted on the vehicle screen is computed from the real scheduledAt
        // and is genuinely final (audit P0-3).
        router.push('/(app)/book/details');
      }}
    />
  );
}

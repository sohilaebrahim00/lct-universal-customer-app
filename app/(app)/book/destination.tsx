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
      onConfirm={async (result) => {
        update({ dropoffAddress: result.address, dropoffLat: result.lat || undefined, dropoffLng: result.lng || undefined });

        if (draft.pickupLat && draft.pickupLng && result.lat && result.lng) {
          const route = await getRoute({ lat: draft.pickupLat, lng: draft.pickupLng }, { lat: result.lat, lng: result.lng });
          if (route) {
            update({
              distanceMiles: Math.round(route.distanceMiles * 10) / 10,
              durationMinutes: Math.round(route.durationMinutes),
              routePolyline: route.polyline,
            });
          }
        }

        router.push('/(app)/book/vehicle');
      }}
    />
  );
}

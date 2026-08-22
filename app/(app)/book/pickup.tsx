import { useRouter } from 'expo-router';
import { LocationPickerScreen } from '../../../src/components/maps/LocationPickerScreen';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';

export default function PickupStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const update = useBookingFormStore((s) => s.update);

  return (
    <LocationPickerScreen
      title="Pickup Location"
      subtitle="Search for a pickup address"
      onConfirm={(result) => {
        update({ pickupAddress: result.address, pickupLat: result.lat || undefined, pickupLng: result.lng || undefined });
        if (draft.serviceType === 'hourly') {
          // Hourly has no destination, but still needs a date before the car.
          router.push('/(app)/book/details');
        } else {
          router.push('/(app)/book/destination');
        }
      }}
    />
  );
}

import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

interface Coords {
  lat: number;
  lng: number;
}

interface UseCurrentLocationResult {
  loading: boolean;
  error: string | null;
  getCurrentLocation: () => Promise<Coords | null>;
}

/** Requests foreground location permission on demand (not on mount) and returns the device's current coordinates. */
export function useCurrentLocation(): UseCurrentLocationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(async (): Promise<Coords | null> => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission was not granted.');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: position.coords.latitude, lng: position.coords.longitude };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get current location');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, getCurrentLocation };
}

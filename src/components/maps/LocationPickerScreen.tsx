import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { Region } from 'react-native-maps';
import { MapPin, Locate } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { AppText } from '../ui/Typography';
import { TextField } from '../ui/TextField';
import { colors, radius, spacing } from '../../theme/tokens';
import { PlacesAutocomplete } from './PlacesAutocomplete';
import { reverseGeocode } from '../../lib/googlePlaces';
import { useCurrentLocation } from '../../lib/useCurrentLocation';
import { isMapsConfigured } from '../../lib/env';
import { isExpoGo } from '../../lib/expoEnvironment';

const DEFAULT_REGION: Region = {
  // Dallas–Fort Worth — LCT Universal's home market — used only as a
  // starting map center before the user picks a real location or grants
  // location permission; never sent to the backend as-is.
  latitude: 32.7767,
  longitude: -96.797,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export interface LocationResult {
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  title: string;
  subtitle: string;
  onConfirm: (result: LocationResult) => void;
  bias?: { lat: number; lng: number };
}

interface MapHandle {
  animateToRegion: (region: Region, duration?: number) => void;
}

// The real map view is only ever rendered when Google Maps is configured,
// we're not running in Expo Go, AND we're not on web (see the early return
// in LocationPickerScreen below) — react-native-maps wraps a native
// UIKit/Google Maps view with no real web renderer, so it's never even
// attempted there, matching the web-preview build's mock-map requirement.
// `react-native-maps` is required lazily here, inside this component's own
// render, rather than as a static top-level import, so its native binding
// is only ever touched on a platform where it's actually going to render.
// Same reasoning and pattern as StripeAppProvider.tsx.
function NativeLocationMap({
  mapRef,
  region,
  onRegionChangeComplete,
}: {
  mapRef: RefObject<MapHandle | null>;
  region: Region;
  onRegionChangeComplete: (region: Region) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy load, see comment above.
  const MapView = require('react-native-maps').default as typeof import('react-native-maps').default;
  return (
    <MapView
      ref={mapRef as never}
      style={StyleSheet.absoluteFill}
      initialRegion={region}
      onRegionChangeComplete={onRegionChangeComplete}
      showsUserLocation
    />
  );
}

export function LocationPickerScreen({ title, subtitle, onConfirm, bias }: Props) {
  const router = useRouter();
  const mapRef = useRef<MapHandle | null>(null);
  const [region, setRegion] = useState<Region>(
    bias ? { ...DEFAULT_REGION, latitude: bias.lat, longitude: bias.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 } : DEFAULT_REGION,
  );
  const [address, setAddress] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const { loading: locating, getCurrentLocation } = useCurrentLocation();
  const regionDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapAvailable = isMapsConfigured && !isExpoGo && Platform.OS !== 'web';

  const resolveAddress = useCallback((lat: number, lng: number) => {
    setResolving(true);
    reverseGeocode(lat, lng)
      .then((result) => setAddress(result))
      .finally(() => setResolving(false));
  }, []);

  useEffect(() => {
    if (!mapAvailable) return;
    // Deferred a microtask so the initial resolve's setState doesn't run
    // synchronously within the effect body itself — same outcome (starts
    // essentially immediately after mount), just satisfies the rule that
    // effects shouldn't call setState synchronously. Subsequent moves are
    // handled by onRegionChangeComplete, not this effect.
    const lat = region.latitude;
    const lng = region.longitude;
    Promise.resolve().then(() => resolveAddress(lat, lng));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRegionChangeComplete(next: Region) {
    setRegion(next);
    if (regionDebounce.current) clearTimeout(regionDebounce.current);
    regionDebounce.current = setTimeout(() => resolveAddress(next.latitude, next.longitude), 400);
  }

  function handlePlaceSelected(details: { formattedAddress: string; lat: number; lng: number }) {
    const next: Region = { latitude: details.lat, longitude: details.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    setRegion(next);
    setAddress(details.formattedAddress);
    mapRef.current?.animateToRegion(next, 400);
  }

  async function handleUseCurrentLocation() {
    const coords = await getCurrentLocation();
    if (!coords) return;
    const next: Region = { latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    setRegion(next);
    mapRef.current?.animateToRegion(next, 400);
    resolveAddress(coords.lat, coords.lng);
  }

  function handleConfirm() {
    if (mapAvailable) {
      if (!address) return;
      onConfirm({ address, lat: region.latitude, lng: region.longitude });
    } else {
      if (!manualAddress.trim()) return;
      onConfirm({ address: manualAddress.trim(), lat: 0, lng: 0 });
    }
    router.back();
  }

  if (!mapAvailable) {
    return (
      <View style={[styles.container, { padding: spacing.lg, justifyContent: 'center' }]}>
        <AppText variant="title" style={{ marginBottom: spacing.xs }}>
          {title}
        </AppText>
        <AppText variant="bodyMuted" style={{ marginBottom: spacing.lg }}>
          {Platform.OS === 'web'
            ? 'This web preview shows a placeholder here — the interactive map picker is available in the iOS/Android app. Enter the address manually below.'
            : isExpoGo
              ? "Map search doesn't run inside Expo Go — enter the address manually. Open this build with the LCT Universal development client for the full map picker."
              : "Map search isn't configured on this build yet (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is missing) — enter the address manually."}
        </AppText>
        <TextField label="Address" value={manualAddress} onChangeText={setManualAddress} placeholder={subtitle} />
        <Button label="Confirm Location" onPress={handleConfirm} disabled={!manualAddress.trim()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NativeLocationMap mapRef={mapRef} region={region} onRegionChangeComplete={handleRegionChangeComplete} />

      <View pointerEvents="none" style={styles.centerPin}>
        <MapPin size={40} color={colors.gold} strokeWidth={1.5} />
      </View>

      <View style={styles.searchOverlay}>
        <PlacesAutocomplete placeholder={subtitle} bias={bias} onSelect={handlePlaceSelected} />
      </View>

      <Pressable style={styles.locateButton} onPress={handleUseCurrentLocation} disabled={locating}>
        {locating ? <ActivityIndicator color={colors.gold} /> : <Locate size={22} color={colors.gold} strokeWidth={1.5} />}
      </Pressable>

      <View style={styles.bottomSheet}>
        <AppText variant="caption">{title}</AppText>
        {resolving ? (
          <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.sm, alignSelf: 'flex-start' }} />
        ) : (
          <AppText variant="subheading" style={{ marginVertical: spacing.xs }} numberOfLines={2}>
            {address ?? 'Move the map to select a location'}
          </AppText>
        )}
        <Button label="Confirm Location" onPress={handleConfirm} disabled={!address || resolving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBlack },
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    alignItems: 'center',
  },
  searchOverlay: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    right: spacing.md,
  },
  locateButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: 200,
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.onyx,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.onyx,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
});

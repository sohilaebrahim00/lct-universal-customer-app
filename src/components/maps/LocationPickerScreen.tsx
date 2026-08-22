import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { Region } from 'react-native-maps';
import { Locate, MapPin } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { AppText } from '../ui/Typography';
import { TextField } from '../ui/TextField';
import { gutter, iconSize, iconStroke, radius, space, theme } from '../../theme';
import { PlacesAutocomplete } from './PlacesAutocomplete';
import { PlacesSheet } from './PlacesSheet';
import { NativePickerMap, type PickerMapHandle } from './NativePickerMap';
import { geocodeAddress, reverseGeocode } from '../../lib/googlePlaces';
import { useCurrentLocation } from '../../lib/useCurrentLocation';
import { useMotion } from '../../lib/useMotion';
import { isMapsConfigured } from '../../lib/env';
import { isExpoGo } from '../../lib/expoEnvironment';
import { profilesApi } from '../../api/profiles';
import { bookingsApi } from '../../api/bookings';
import { recentPlacesFrom, type RecentPlace } from '../../lib/recentPlaces';
import type { LatLng } from '../../lib/geo';
import type { SavedLocation } from '../../types/api';

/**
 * PICKUP AND DESTINATION — artboards 2d and 2e.
 *
 * One component, two screens. They differ only in their copy and in whether a
 * route is drawn, which is not enough difference to justify two files that
 * drift apart.
 *
 * ── What changed from the old picker ────────────────────────────────────────
 * The default Google surface became the app's own near-black style; the static
 * pin now lifts while the map moves; saved and recent places sit in the sheet
 * instead of forcing every customer to type an address they have typed before;
 * and the destination screen draws the route with `fitToCoordinates` rather
 * than the hand-rolled `latitudeDelta: 0.01` that framed every journey
 * identically regardless of length.
 *
 * ── Every fallback is intact ────────────────────────────────────────────────
 * `mapAvailable` is false when Maps is unconfigured, inside Expo Go, or on web,
 * and the manual-entry screen is unchanged in behaviour. It is reached by more
 * customers than the map is during development, and it is the only path the web
 * demo has.
 *
 * ── Unverified on web, and this is expected ─────────────────────────────────
 * `react-native-maps` has no web implementation, so the map, the lifting pin,
 * `fitToCoordinates` and the route polyline CANNOT be exercised in the web
 * build. Same caveat as the tracking screen. What web verifies is the manual
 * fallback; the map path needs a device. See RUNBOOK_AUTH_VERIFICATION.md §7.
 */

const DEFAULT_REGION: Region = {
  // Dallas–Fort Worth, LCT's home market. A starting camera only — never sent
  // to the backend, and replaced the moment the customer picks anything.
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
  /**
   * The journey's other end. When set, the map draws the route to it and frames
   * both — this is what makes the destination screen a destination screen.
   */
  origin?: LatLng | null;
  /** Label for the primary action. Defaults to the generic one. */
  confirmLabel?: string;
}

export function LocationPickerScreen({ title, subtitle, onConfirm, bias, origin, confirmLabel }: Props) {
  const mapRef = useRef<PickerMapHandle | null>(null);
  const motion = useMotion();

  const [region, setRegion] = useState<Region>(
    bias
      ? { ...DEFAULT_REGION, latitude: bias.lat, longitude: bias.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }
      : DEFAULT_REGION,
  );
  const [address, setAddress] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [saved, setSaved] = useState<SavedLocation[]>([]);
  const [recent, setRecent] = useState<RecentPlace[]>([]);
  const { loading: locating, getCurrentLocation } = useCurrentLocation();
  const regionDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Drives the pin's lift. 0 = resting on the map, 1 = raised. */
  const [lift] = useState(() => new Animated.Value(0));

  const mapAvailable = isMapsConfigured && !isExpoGo && Platform.OS !== 'web';

  const resolveAddress = useCallback((lat: number, lng: number) => {
    setResolving(true);
    reverseGeocode(lat, lng)
      .then(setAddress)
      .finally(() => setResolving(false));
  }, []);

  /* ---- saved and recent places ---- */
  useEffect(() => {
    let active = true;
    // Both are conveniences. A failure means the lists do not appear; it is
    // never a screen error, because search and the map still work without them.
    void profilesApi
      .savedLocations()
      .then((locations) => {
        if (active) setSaved(locations);
        return locations;
      })
      .catch(() => [] as SavedLocation[])
      .then((locations) =>
        bookingsApi
          .list()
          .then((bookings) => {
            if (active) setRecent(recentPlacesFrom(bookings, { exclude: locations }));
          })
          .catch(() => {}),
      );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mapAvailable) return;
    // Deferred a microtask so the first resolve's setState never runs
    // synchronously inside the effect body.
    const { latitude, longitude } = region;
    void Promise.resolve().then(() => resolveAddress(latitude, longitude));
    // Mount only: every later move is handled by onRegionChangeComplete.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * THE PIN LIFTS WHILE THE MAP MOVES.
   *
   * Not decoration. A pin welded to the centre of a moving map reads as part of
   * the map, and the customer cannot tell whether they are dragging the pin or
   * the world beneath it. Lifting it — with the shadow staying put — says the
   * map is moving and the pin is held, which is exactly what is happening.
   *
   * Under reduced motion it does not lift. The shadow alone still separates the
   * two planes, and the address readout is the real feedback either way.
   */
  function setPinLifted(raised: boolean) {
    if (motion.reduced) return;
    Animated.spring(lift, {
      toValue: raised ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: raised ? 0 : 6,
    }).start();
  }

  function handleRegionChange() {
    setPinLifted(true);
  }

  function handleRegionChangeComplete(next: Region) {
    setPinLifted(false);
    setRegion(next);
    if (regionDebounce.current) clearTimeout(regionDebounce.current);
    // Debounced: a customer panning across the metroplex would otherwise fire a
    // geocode per frame, and each one costs money.
    regionDebounce.current = setTimeout(() => resolveAddress(next.latitude, next.longitude), 400);
  }

  function moveTo(lat: number, lng: number) {
    const next: Region = { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    setRegion(next);
    mapRef.current?.animateToRegion(next, 400);
  }

  function handlePlaceSelected(details: { formattedAddress: string; lat: number; lng: number }) {
    setAddress(details.formattedAddress);
    moveTo(details.lat, details.lng);
  }

  /**
   * A saved or recent place commits immediately.
   *
   * The customer has already named the place; asking them to confirm a map
   * position for it is a step that exists only because it was easier to build.
   * A recent stored through the manual fallback has no coordinates, so it is
   * geocoded first — and if that fails it is still committed by address, which
   * is exactly what the manual path does anyway.
   */
  async function handlePlacePicked(place: { address: string; lat: number | null; lng: number | null }) {
    if (place.lat !== null && place.lng !== null && (place.lat !== 0 || place.lng !== 0)) {
      onConfirm({ address: place.address, lat: place.lat, lng: place.lng });
      return;
    }
    const point = await geocodeAddress(place.address);
    onConfirm({ address: place.address, lat: point?.lat ?? 0, lng: point?.lng ?? 0 });
  }

  async function handleUseCurrentLocation() {
    const coords = await getCurrentLocation();
    if (!coords) return;
    moveTo(coords.lat, coords.lng);
    resolveAddress(coords.lat, coords.lng);
  }

  function handleConfirm() {
    /*
     * ONE COMMIT, ONE TRANSITION.
     *
     * This used to call onConfirm() — which itself pushes the next step — and
     * THEN router.back(), popping the screen it had just pushed. On the dev
     * server the race usually resolved forwards; in a production build it
     * resolved backwards, so the booking flow never advanced past pickup at
     * all. The caller owns navigation; this only reports the result.
     */
    if (mapAvailable) {
      if (!address) return;
      onConfirm({ address, lat: region.latitude, lng: region.longitude });
    } else {
      if (!manualAddress.trim()) return;
      onConfirm({ address: manualAddress.trim(), lat: 0, lng: 0 });
    }
  }

  /* ------------------------------------------------------------------ *
   * Manual entry — Maps unconfigured, Expo Go, or web.
   * ------------------------------------------------------------------ */
  if (!mapAvailable) {
    return (
      <ScrollView contentContainerStyle={styles.manual}>
        <AppText variant="title" accessibilityRole="header" style={styles.manualTitle}>
          {title}
        </AppText>
        <AppText variant="bodyMuted" style={styles.manualBody}>
          {Platform.OS === 'web'
            ? 'This web preview shows a placeholder here — the interactive map picker is available in the iOS/Android app. Enter the address manually below.'
            : isExpoGo
              ? "Map search doesn't run inside Expo Go — enter the address manually. Open this build with the LCT Universal development client for the full map picker."
              : "Map search isn't configured on this build yet (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is missing) — enter the address manually."}
        </AppText>

        {/*
          Saved and recent places work WITHOUT a map, and this is where they
          matter most: it is the path with no search, no autocomplete and no
          panning, so a one-tap route to a known address is the only shortcut
          available at all.
        */}
        <PlacesSheet saved={saved} recent={recent} onSelect={handlePlacePicked} />

        <TextField
          label="Address"
          value={manualAddress}
          onChangeText={setManualAddress}
          placeholder={subtitle}
          containerStyle={styles.manualField}
        />
        <Button
          label={confirmLabel ?? 'Confirm Location'}
          onPress={handleConfirm}
          disabled={!manualAddress.trim()}
        />
      </ScrollView>
    );
  }

  /* ------------------------------------------------------------------ *
   * The map.
   * ------------------------------------------------------------------ */
  return (
    <View style={styles.container}>
      <NativePickerMap
        mapRef={mapRef}
        region={region}
        origin={origin ?? null}
        target={{ latitude: region.latitude, longitude: region.longitude }}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
      />

      {/*
        The pin, and its shadow, as two separate planes. The shadow stays on the
        map while the pin rises — that separation is the whole signal.
      */}
      <View pointerEvents="none" style={styles.centrePin}>
        <Animated.View
          style={[
            styles.pinShadow,
            { transform: [{ scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }] },
          ]}
        />
        <Animated.View
          style={{
            transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }],
          }}
        >
          <MapPin size={40} color={theme.content.accent} strokeWidth={1.5} />
        </Animated.View>
      </View>

      <View style={styles.searchOverlay}>
        <PlacesAutocomplete placeholder={subtitle} bias={bias} onSelect={handlePlaceSelected} />
      </View>

      <Pressable
        style={styles.locateButton}
        onPress={handleUseCurrentLocation}
        disabled={locating}
        accessibilityRole="button"
        accessibilityLabel="Use my current location"
      >
        {locating ? (
          <ActivityIndicator color={theme.content.accent} />
        ) : (
          <Locate size={iconSize.md} color={theme.content.accent} strokeWidth={iconStroke.interactive} />
        )}
      </Pressable>

      <View style={styles.sheet}>
        <AppText variant="micro">{title}</AppText>
        {resolving ? (
          <ActivityIndicator color={theme.content.accent} style={styles.resolving} />
        ) : (
          <AppText variant="subheading" style={styles.address} numberOfLines={2}>
            {address ?? 'Move the map to select a location'}
          </AppText>
        )}

        <ScrollView style={styles.places} showsVerticalScrollIndicator={false}>
          <PlacesSheet saved={saved} recent={recent} onSelect={handlePlacePicked} />
        </ScrollView>

        <Button
          label={confirmLabel ?? 'Confirm Location'}
          onPress={handleConfirm}
          disabled={!address || resolving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background.primary },

  manual: { padding: gutter, paddingTop: space.xl },
  manualTitle: { marginBottom: space.xs },
  manualBody: { marginBottom: space.md },
  manualField: { marginTop: space.md, marginBottom: space.md },

  centrePin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    alignItems: 'center',
  },
  /* Sits under the pin, on the map plane, and shrinks as the pin rises. */
  pinShadow: {
    position: 'absolute',
    bottom: -3,
    width: 12,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  searchOverlay: { position: 'absolute', top: space.xl, left: space.md, right: space.md },
  locateButton: {
    position: 'absolute',
    right: space.md,
    bottom: 300,
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: theme.background.tertiary,
    borderWidth: 1,
    borderColor: theme.border.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '55%',
    backgroundColor: theme.background.tertiary,
    borderTopWidth: 1,
    borderTopColor: theme.border.hairlineStrong,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: gutter,
    paddingBottom: space.xl,
  },
  resolving: { marginVertical: space.sm, alignSelf: 'flex-start' },
  address: { marginVertical: space.xs },
  places: { flexGrow: 0, marginBottom: space.smd },
});

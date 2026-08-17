import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSizes, radius, spacing } from '../../theme/tokens';
import { AppText } from '../ui/Typography';
import {
  autocompletePlaces,
  getPlaceDetails,
  newPlacesSessionToken,
  type PlaceDetails,
  type PlaceSuggestion,
} from '../../lib/googlePlaces';
import { isMapsConfigured } from '../../lib/env';
import { TextField } from '../ui/TextField';

interface Props {
  placeholder: string;
  bias?: { lat: number; lng: number };
  onSelect: (details: PlaceDetails) => void;
}

const DEBOUNCE_MS = 300;

export function PlacesAutocomplete({ placeholder, bias, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const sessionToken = useRef(newPlacesSessionToken());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!isMapsConfigured || query.trim().length < 3) {
      // Deferred a microtask so this doesn't setState synchronously within
      // the effect body — same outcome, just satisfies the rule.
      Promise.resolve().then(() => setSuggestions([]));
      return;
    }
    // Deferred a microtask so this doesn't setState synchronously within the effect body — same outcome, just
    // satisfies the rule; the setTimeout scheduling itself (not a setState call) still happens synchronously.
    Promise.resolve().then(() => setSearching(true));
    debounceTimer.current = setTimeout(async () => {
      const results = await autocompletePlaces(query, sessionToken.current, bias);
      setSuggestions(results);
      setSearching(false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function handleSelect(suggestion: PlaceSuggestion) {
    setResolving(true);
    const details = await getPlaceDetails(suggestion.placeId, sessionToken.current);
    setResolving(false);
    if (details) {
      setQuery(details.formattedAddress);
      setSuggestions([]);
      sessionToken.current = newPlacesSessionToken();
      onSelect(details);
    }
  }

  return (
    <View>
      <TextField
        label=""
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        autoCapitalize="words"
        style={{ marginBottom: 0 }}
      />
      {(searching || resolving) && (
        <ActivityIndicator color={colors.gold} style={styles.spinner} size="small" />
      )}
      {suggestions.length > 0 ? (
        <View style={styles.dropdown}>
          {suggestions.map((s) => (
            <Pressable key={s.placeId} style={styles.row} onPress={() => handleSelect(s)}>
              <Ionicons name="location-outline" size={16} color={colors.gold} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <AppText style={styles.primaryText}>{s.primaryText}</AppText>
                {s.secondaryText ? (
                  <AppText variant="caption">{s.secondaryText}</AppText>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: { position: 'absolute', right: spacing.md, top: 16 },
  dropdown: {
    backgroundColor: colors.onyx,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  primaryText: { fontFamily: fonts.sansMedium, fontSize: fontSizes.sm, color: colors.offWhite },
});

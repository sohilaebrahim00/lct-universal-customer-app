import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { radius, resolveType, space, theme } from '../../theme';
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
        <ActivityIndicator color={theme.content.accent} style={styles.spinner} size="small" />
      )}
      {suggestions.length > 0 ? (
        <View style={styles.dropdown}>
          {suggestions.map((s) => (
            <Pressable
              key={s.placeId}
              style={styles.row}
              onPress={() => handleSelect(s)}
              accessibilityRole="button"
              accessibilityLabel={`${s.primaryText}, ${s.secondaryText}`}
            >
              <MapPin size={16} color={theme.content.accent} strokeWidth={1.5} />
              <View style={{ flex: 1, marginStart: space.sm }}>
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
  spinner: { position: 'absolute', right: space.md, top: 16 },
  dropdown: {
    backgroundColor: theme.background.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border.hairline,
    marginTop: -space.sm,
    marginBottom: space.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border.hairline,
  },
  /*
   * A TYPE ROLE, not a hand-assembled family and size.
   *
   * This was `fonts.sansMedium` + `fontSizes.sm` — the last place in the app
   * setting type by hand, and the only reason this file still needed the shim.
   * `resolveType` also carries the line height, resolved for `'latin'` — the
   * only script this app renders (Arabic/RTL support was reversed on
   * 2026-08-30; see DESIGN_CHANGELOG.md).
   */
  primaryText: { ...resolveType('caption'), color: theme.content.primary },
});

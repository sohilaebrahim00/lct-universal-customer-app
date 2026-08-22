import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { TextField } from '../../../src/components/ui/TextField';
import { AppText } from '../../../src/components/ui/Typography';

import { profilesApi } from '../../../src/api/profiles';
import type { SavedLocation } from '../../../src/types/api';
import { space, theme } from '../../../src/theme';

export default function SavedLocationsScreen() {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    profilesApi.savedLocations()
      .then(setLocations).catch((cause: unknown) =>
      // Was `.catch(() => {})`: a failed read rendered as an empty list, which
      // tells the customer they have nothing rather than that we could not ask.
      setLoadError(cause instanceof Error ? cause : new Error(String(cause))),
    );
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleAdd() {
    if (!label.trim() || !address.trim()) return;
    setAdding(true);
    try {
      await profilesApi.addSavedLocation({ label: label.trim(), address: address.trim() });
      setLabel('');
      setAddress('');
      load();
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    await profilesApi.removeSavedLocation(id);
    load();
  }

  return (
    <ScreenContainer>
      {loadError ? (
        <ErrorState title="We couldn't load your saved locations" message="This is our end, not yours." onRetry={load} />
      ) : null}
      <AppText variant="title" style={{ marginBottom: space.lg }}>
        Saved Locations
      </AppText>

      {locations.map((loc) => (
        <Card key={loc.id} row style={{ marginBottom: space.sm }}>
          <View style={{ flex: 1 }}>
            <AppText variant="subheading">{loc.label}</AppText>
            <AppText variant="caption">{loc.address}</AppText>
          </View>
          <Pressable
            onPress={() => handleRemove(loc.id)}
            accessibilityRole="button"
            accessibilityLabel={`Remove saved location ${loc.label}`}
            style={styles.removeButton}
          >
            <Trash2 size={20} color={theme.content.danger} strokeWidth={1.5} />
          </Pressable>
        </Card>
      ))}

      <AppText variant="heading" style={{ marginTop: space.lg, marginBottom: space.sm }}>
        Add Location
      </AppText>
      <TextField label="Label" value={label} onChangeText={setLabel} placeholder="Home, Office, ..." />
      <TextField label="Address" value={address} onChangeText={setAddress} />
      <Button label="Add Location" onPress={handleAdd} loading={adding} disabled={!label.trim() || !address.trim()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  /*
   * A REAL 44x44 box, not hitSlop.
   *
   * The icon measured 20x20 in the built app. `hitSlop={10}` would have made
   * it 40 — still under the floor, and invisible to anything that measures what
   * is actually rendered. A destructive control is the last place to be
   * approximate about a touch target.
   */
  removeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { TextField } from '../../../src/components/ui/TextField';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, spacing } from '../../../src/theme/tokens';
import { profilesApi } from '../../../src/api/profiles';
import type { SavedLocation } from '../../../src/types/api';

export default function SavedLocationsScreen() {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    profilesApi.savedLocations().then(setLocations).catch(() => {});
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
      <AppText variant="title" style={{ marginBottom: spacing.lg }}>
        Saved Locations
      </AppText>

      {locations.map((loc) => (
        <Card key={loc.id} style={{ marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="subheading">{loc.label}</AppText>
            <AppText variant="caption">{loc.address}</AppText>
          </View>
          <Pressable onPress={() => handleRemove(loc.id)}>
            <Ionicons name="trash-outline" size={20} color={colors.destructive} />
          </Pressable>
        </Card>
      ))}

      <AppText variant="heading" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
        Add Location
      </AppText>
      <TextField label="Label" value={label} onChangeText={setLabel} placeholder="Home, Office, ..." />
      <TextField label="Address" value={address} onChangeText={setAddress} />
      <Button label="Add Location" onPress={handleAdd} loading={adding} disabled={!label.trim() || !address.trim()} />
    </ScreenContainer>
  );
}

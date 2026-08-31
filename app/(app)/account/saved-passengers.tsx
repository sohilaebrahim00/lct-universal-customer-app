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
import type { SavedPassenger } from '../../../src/types/api';
import { space, theme } from '../../../src/theme';
import { isDemoMode } from '../../../src/lib/env';
import { copy } from '../../../src/copy/strings';

export default function SavedPassengersScreen() {
  const [passengers, setPassengers] = useState<SavedPassenger[]>([]);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    profilesApi.savedPassengers()
      .then(setPassengers).catch((cause: unknown) =>
      // Was `.catch(() => {})`: a failed read rendered as an empty list, which
      // tells the customer they have nothing rather than that we could not ask.
      setLoadError(cause instanceof Error ? cause : new Error(String(cause))),
    );
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleAdd() {
    if (!fullName.trim()) return;
    setAdding(true);
    try {
      await profilesApi.addSavedPassenger({ fullName: fullName.trim(), phone: phone.trim() || undefined });
      setFullName('');
      setPhone('');
      load();
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    await profilesApi.removeSavedPassenger(id);
    load();
  }

  return (
    <ScreenContainer>
      {loadError ? (
        <ErrorState title="We couldn't load your saved passengers" message="This is our end, not yours." onRetry={load} />
      ) : null}
      <AppText variant="title" style={{ marginBottom: isDemoMode ? 2 : space.lg }}>
        Saved Passengers
      </AppText>
      {isDemoMode ? (
        <AppText variant="caption" style={{ marginBottom: space.lg }}>
          {copy.common.demoDataNotice}
        </AppText>
      ) : null}

      {passengers.map((p) => (
        <Card key={p.id} row style={{ marginBottom: space.sm }}>
          <View style={{ flex: 1 }}>
            <AppText variant="subheading">{p.full_name}</AppText>
            {p.phone ? <AppText variant="caption">{p.phone}</AppText> : null}
          </View>
          <Pressable
            onPress={() => handleRemove(p.id)}
            accessibilityRole="button"
            accessibilityLabel={`Remove saved passenger ${p.full_name}`}
            style={styles.removeButton}
          >
            <Trash2 size={20} color={theme.content.danger} strokeWidth={1.5} />
          </Pressable>
        </Card>
      ))}

      <AppText variant="heading" style={{ marginTop: space.lg, marginBottom: space.sm }}>
        Add Passenger
      </AppText>
      <TextField label="Full Name" value={fullName} onChangeText={setFullName} />
      <TextField label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Button label="Add Passenger" onPress={handleAdd} loading={adding} disabled={!fullName.trim()} />
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

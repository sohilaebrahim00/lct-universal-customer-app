import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { TextField } from '../../../src/components/ui/TextField';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, spacing } from '../../../src/theme/tokens';
import { profilesApi } from '../../../src/api/profiles';
import type { SavedPassenger } from '../../../src/types/api';

export default function SavedPassengersScreen() {
  const [passengers, setPassengers] = useState<SavedPassenger[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    profilesApi.savedPassengers().then(setPassengers).catch(() => {});
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
      <AppText variant="title" style={{ marginBottom: spacing.lg }}>
        Saved Passengers
      </AppText>

      {passengers.map((p) => (
        <Card key={p.id} style={{ marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="subheading">{p.full_name}</AppText>
            {p.phone ? <AppText variant="caption">{p.phone}</AppText> : null}
          </View>
          <Pressable onPress={() => handleRemove(p.id)}>
            <Trash2 size={20} color={colors.destructive} strokeWidth={1.5} />
          </Pressable>
        </Card>
      ))}

      <AppText variant="heading" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
        Add Passenger
      </AppText>
      <TextField label="Full Name" value={fullName} onChangeText={setFullName} />
      <TextField label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Button label="Add Passenger" onPress={handleAdd} loading={adding} disabled={!fullName.trim()} />
    </ScreenContainer>
  );
}

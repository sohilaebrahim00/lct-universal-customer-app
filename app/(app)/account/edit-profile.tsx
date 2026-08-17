import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/ui/Button';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { TextField } from '../../../src/components/ui/TextField';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, spacing } from '../../../src/theme/tokens';
import { useAuthStore } from '../../../src/store/authStore';
import { profilesApi } from '../../../src/api/profiles';

export default function EditProfileScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await profilesApi.updateMe({ fullName: fullName.trim(), phone: phone.trim() || undefined });
      await refreshProfile();
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <AppText variant="title" style={{ marginBottom: spacing.lg }}>
        Edit Profile
      </AppText>
      <TextField label="Full Name" value={fullName} onChangeText={setFullName} />
      <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      {error ? (
        <AppText variant="caption" color={colors.destructive} style={{ marginBottom: spacing.md }}>
          {error}
        </AppText>
      ) : null}
      <Button label="Save" onPress={handleSave} loading={saving} />
    </ScreenContainer>
  );
}

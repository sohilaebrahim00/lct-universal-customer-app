import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../src/components/ui/Button';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { TextField } from '../../../src/components/ui/TextField';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, radius, spacing } from '../../../src/theme/tokens';
import { useAuthStore } from '../../../src/store/authStore';
import { profilesApi } from '../../../src/api/profiles';
import { pickAndUploadAvatar } from '../../../src/lib/avatarUpload';

export default function EditProfileScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickAvatar() {
    if (!profile) return;
    setUploadingAvatar(true);
    setError(null);
    const result = await pickAndUploadAvatar(profile.id);
    setUploadingAvatar(false);

    if ('error' in result) {
      setError(result.error);
      return;
    }
    if ('cancelled' in result) return;

    setAvatarUrl(result.url);
    try {
      await profilesApi.updateMe({ avatarUrl: result.url });
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo uploaded, but saving it to your profile failed');
    }
  }

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

      <Pressable onPress={handlePickAvatar} style={styles.avatarWrap} disabled={uploadingAvatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={32} color={colors.gold} />
          </View>
        )}
        <View style={styles.avatarBadge}>
          {uploadingAvatar ? <ActivityIndicator size="small" color={colors.surfaceBlack} /> : <Ionicons name="camera" size={14} color={colors.surfaceBlack} />}
        </View>
      </Pressable>
      <AppText variant="caption" center style={{ marginBottom: spacing.lg }}>
        Tap to change photo
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

const styles = StyleSheet.create({
  avatarWrap: { alignSelf: 'center', marginBottom: spacing.sm },
  avatar: { width: 96, height: 96, borderRadius: radius.full },
  avatarPlaceholder: { backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceBlack,
  },
});

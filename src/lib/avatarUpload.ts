import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

const BUCKET = 'avatars';

/**
 * Uploads a profile photo to Supabase Storage and returns its public URL.
 * Requires a public `avatars` bucket to exist in the Supabase project —
 * that's a one-time dashboard/SQL setup step this code can't perform
 * itself (no live Supabase project in this environment); see README.
 */
export async function pickAndUploadAvatar(profileId: string): Promise<{ url: string } | { cancelled: true } | { error: string }> {
  if (!supabase) return { error: 'Supabase is not configured on this build.' };

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { error: 'Photo library permission was not granted.' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    base64: true,
  });

  if (result.canceled || !result.assets[0]?.base64) return { cancelled: true };

  const asset = result.assets[0];
  const extension = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${profileId}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, decode(asset.base64!), {
    contentType: asset.mimeType ?? 'image/jpeg',
    upsert: true,
  });

  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from './env';

/**
 * Supabase is the source of truth for authentication (signup/login/forgot
 * password) — this app never talks to a custom auth endpoint on the
 * backend. The backend only verifies the JWT this client obtains (see
 * lct-universal-backend/src/middleware/auth.ts).
 *
 * When Supabase isn't configured yet, `supabase` is `null` and every screen
 * that needs auth shows a clear "not configured" state instead of crashing
 * — same graceful-degradation contract as the backend's integrations.
 */
export const supabase = isSupabaseConfigured
  ? createClient(env.EXPO_PUBLIC_SUPABASE_URL!, env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

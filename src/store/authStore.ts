import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { profilesApi } from '../api/profiles';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/api';

type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'not-configured';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  error: string | null;
  initialize: () => () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: supabase ? 'loading' : 'not-configured',
  session: null,
  profile: null,
  error: null,

  initialize: () => {
    if (!supabase) {
      set({ status: 'not-configured' });
      return () => {};
    }

    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, status: data.session ? 'signed-in' : 'signed-out' });
      if (data.session) void get().refreshProfile();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, status: session ? 'signed-in' : 'signed-out' });
      if (session) {
        void get().refreshProfile();
      } else {
        set({ profile: null });
      }
    });

    return () => subscription.subscription.unsubscribe();
  },

  refreshProfile: async () => {
    try {
      const profile = await profilesApi.me();
      set({ profile, error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load profile' });
    }
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ session: null, profile: null, status: 'signed-out' });
  },
}));

import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { profilesApi } from '../api/profiles';
import { supabase } from '../lib/supabase';
import { isDemoMode } from '../lib/env';
import { isGuestMode, setGuestMode } from '../lib/guestMode';
import type { Profile } from '../types/api';

type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'not-configured';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  error: string | null;
  /** True once the guest-mode flag has been read from storage — gates routing decisions until known. */
  guestModeChecked: boolean;
  isGuest: boolean;
  initialize: () => () => void;
  refreshProfile: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: supabase ? 'loading' : 'not-configured',
  session: null,
  profile: null,
  error: null,
  guestModeChecked: false,
  isGuest: false,

  initialize: () => {
    /*
     * DEMO MODE — auth is bypassed and the app opens signed in.
     *
     * This one branch is the difference between a demo that reads as a finished
     * product and one that reads as an empty shell: without a session, Home has
     * no upcoming trip, Trips shows a sign-in gate, and Account is a guest card.
     * The profile comes from the seeded dataset, not from a token — no Supabase
     * call is made, and there is no session to be had.
     *
     * Gated on the build-time flag only. A normal build never takes this path.
     */
    if (isDemoMode) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy so the seed is only touched in demo mode; see metro.config.js
      const { DEMO_PROFILE } = require('../dev/demoData') as typeof import('../dev/demoData');
      set({
        status: 'signed-in',
        session: null,
        profile: DEMO_PROFILE,
        isGuest: false,
        guestModeChecked: true,
      });
      return () => {};
    }

    isGuestMode().then((guest) => set({ isGuest: guest, guestModeChecked: true }));

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
        // A real session always wins over guest browsing.
        void setGuestMode(false);
        set({ isGuest: false });
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

  continueAsGuest: async () => {
    await setGuestMode(true);
    set({ isGuest: true });
  },

  signOut: async () => {
    // In a demo build there is no session to end; signing out would strand the
    // client on a welcome screen with no way back to the populated app.
    if (isDemoMode || !supabase) return;
    await supabase.auth.signOut();
    // Leaving an account returns to guest browsing, not a forced welcome
    // screen — the app itself is never fully locked behind auth.
    await setGuestMode(true);
    set({ session: null, profile: null, status: 'signed-out', isGuest: true });
  },
}));

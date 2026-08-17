import { z } from 'zod';

/**
 * Single source of truth for runtime config, mirroring the pattern used in
 * lct-universal-backend's src/config/env.ts. Only EXPO_PUBLIC_* variables
 * are readable here — Metro inlines them into the JS bundle at build time;
 * anything not prefixed EXPO_PUBLIC_ is undefined on-device by design.
 *
 * Only EXPO_PUBLIC_API_URL is required. Supabase/Stripe/Maps keys are
 * optional so the app can still boot (and clearly flag what's missing)
 * before every credential is provisioned — matching the backend's
 * graceful-degradation approach rather than crashing on launch.
 */

const schema = z.object({
  EXPO_PUBLIC_API_URL: z.string().min(1, 'EXPO_PUBLIC_API_URL is required'),
  EXPO_PUBLIC_WS_URL: z.string().optional(),
  EXPO_PUBLIC_SUPABASE_URL: z.string().optional(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
});

function loadEnv() {
  const parsed = schema.safeParse({
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_WS_URL: process.env.EXPO_PUBLIC_WS_URL,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(
      `Invalid app configuration:\n${issues}\n\nCopy .env.example to .env and set at least EXPO_PUBLIC_API_URL, then restart the dev server (env vars are inlined at bundle time).`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();

export const apiBaseUrl = env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
export const wsBaseUrl = (env.EXPO_PUBLIC_WS_URL ?? apiBaseUrl.replace(/^http/, 'ws')).replace(/\/+$/, '');

export const isSupabaseConfigured = Boolean(env.EXPO_PUBLIC_SUPABASE_URL && env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
export const isStripeConfigured = Boolean(env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY);
export const isMapsConfigured = Boolean(env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);

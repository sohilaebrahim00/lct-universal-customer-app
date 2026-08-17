import { z } from 'zod';

/**
 * Single source of truth for runtime config, mirroring the pattern used in
 * lct-universal-backend's src/config/env.ts. Only EXPO_PUBLIC_* variables
 * are readable here — Metro inlines them into the JS bundle at build time;
 * anything not prefixed EXPO_PUBLIC_ is undefined on-device by design.
 *
 * Every variable is optional at the schema level, including the API URL —
 * a missing/misconfigured .env must never crash the app at launch. When
 * EXPO_PUBLIC_API_URL isn't set, it falls back to the local-dev default
 * documented in .env.example (http://localhost:4000) with a console
 * warning, so `npx expo start` still boots for a first-time clone before
 * `.env` has been created — exactly the same graceful-degradation contract
 * already used for Supabase/Stripe/Maps below, just applied consistently
 * instead of the API URL being the one exception that hard-crashed.
 */

const DEFAULT_API_URL = 'http://localhost:4000';

const schema = z.object({
  EXPO_PUBLIC_API_URL: z.string().min(1).optional(),
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
    // Reachable only if a *provided* value fails validation (e.g. an empty
    // string) — a genuinely malformed .env, not just a missing one. Still
    // throws here on purpose: bad config the developer typed is worth
    // surfacing loudly, unlike config that was simply never set yet.
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Invalid app configuration:\n${issues}\n\nCheck your .env against .env.example.`);
  }

  return parsed.data;
}

const parsedEnv = loadEnv();

if (!parsedEnv.EXPO_PUBLIC_API_URL) {
  console.warn(
    `[env] EXPO_PUBLIC_API_URL is not set — defaulting to ${DEFAULT_API_URL} for local development.\n` +
      'Copy .env.example to .env and set it explicitly to point at a real backend.',
  );
}

export const env = { ...parsedEnv, EXPO_PUBLIC_API_URL: parsedEnv.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL };

export const isApiUrlConfigured = Boolean(parsedEnv.EXPO_PUBLIC_API_URL);
export const apiBaseUrl = env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
export const wsBaseUrl = (env.EXPO_PUBLIC_WS_URL ?? apiBaseUrl.replace(/^http/, 'ws')).replace(/\/+$/, '');

export const isSupabaseConfigured = Boolean(env.EXPO_PUBLIC_SUPABASE_URL && env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
export const isStripeConfigured = Boolean(env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY);
export const isMapsConfigured = Boolean(env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);

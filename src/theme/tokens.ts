/**
 * Brand tokens ported from the LCT Universal website
 * (LCT-Universal-Vite-Ready-v2/src/styles.css `:root`) so the mobile app
 * reads as the same brand, not a reskin. The website defines these in
 * OKLCH; React Native's color parser doesn't support OKLCH, so these are
 * exact sRGB conversions of the same OKLCH values (computed directly from
 * the site's L/C/H numbers, not eyeballed) — see the site's
 * `--surface-black`, `--gold`, etc. for the source of truth if the palette
 * changes there.
 */
export const colors = {
  surfaceBlack: '#020201',
  surfaceElevated: '#050403',
  onyx: '#0b0907',
  charcoal: '#1c1a18',
  muted: '#13110f',
  mutedForeground: '#9e978e',
  champagne: '#dac288',
  gold: '#d9b160',
  goldSoft: '#e9d6a3',
  goldDeep: '#a26e22',
  offWhite: '#f4f2ea',
  destructive: '#e62b34',
  border: 'rgba(233, 214, 163, 0.16)',
  overlay: 'rgba(2, 2, 1, 0.72)',
} as const;

export const semanticColors = {
  background: colors.surfaceBlack,
  backgroundElevated: colors.surfaceElevated,
  surface: colors.onyx,
  surfaceAlt: colors.charcoal,
  textPrimary: colors.offWhite,
  textMuted: colors.mutedForeground,
  accent: colors.gold,
  accentSoft: colors.goldSoft,
  accentDeep: colors.goldDeep,
  border: colors.border,
  danger: colors.destructive,
} as const;

/** Matches the site's deliberately small, sharp 0.2rem base radius — architectural, not bubbly. */
export const radius = {
  sm: 3,
  md: 5,
  lg: 8,
  xl: 12,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fonts = {
  display: 'CormorantGaramond_600SemiBold',
  displayBold: 'CormorantGaramond_700Bold',
  displayMedium: 'CormorantGaramond_500Medium',
  sans: 'Manrope_400Regular',
  sansMedium: 'Manrope_500Medium',
  sansSemiBold: 'Manrope_600SemiBold',
  sansBold: 'Manrope_700Bold',
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 22,
  xl: 28,
  xxl: 36,
  display: 44,
} as const;

export const shadows = {
  gold: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

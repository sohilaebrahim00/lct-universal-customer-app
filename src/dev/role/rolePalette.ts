import { gold, neutral, state } from '../../theme/ref';

/**
 * The role preview's palette, as PURE VALUES.
 *
 * Split out of `roleTheme.ts` because that file imports `StyleSheet`, and the
 * contrast gate is deliberately importable without React Native — `contrast.ts`
 * says so in its own header, so that colour assertions can run in Jest without
 * dragging a native runtime in.
 *
 * A palette that cannot be measured is a palette whose claims cannot be
 * checked, and the chauffeur view's central claim is about legibility.
 */

export const roleColor = {
  page: neutral[0],
  surface: neutral[100],
  surfaceRaised: neutral[200],
  /** Full-strength off-white. The default for anything a chauffeur reads. */
  text: neutral[900],
  /** Labels only — never a value, never an address, never a name. */
  label: neutral[500],
  /** One step down from `text`, for supporting lines the eye can skip. */
  textSoft: neutral[600],
  accent: gold[500],
  accentSoft: gold[300],
  onAccent: gold.onAccent,
  hairline: 'rgba(244, 242, 234, 0.14)',
  danger: state.dangerText,
  warning: state.warning,
  success: state.success,
} as const;

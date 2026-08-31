import { PixelRatio, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { theme, resolveType, type TypeRole } from '../../theme';

/**
 * The app's only text primitive.
 *
 * Roles, never sizes. `<AppText variant="subheading">` — never `fontSize: 16`.
 * `resolveType(role)` still resolves through the script axis in
 * src/theme/type.ts, defaulting to `'latin'` — Arabic/RTL support was built and
 * then reversed as a business decision (see DESIGN_CHANGELOG.md, 2026-08-30),
 * so nothing here selects `'arabic'` anymore, but the per-script metrics stay
 * in `type.ts` rather than being collapsed into one table.
 *
 * ── Line height and dynamic type ────────────────────────────────────────────
 * React Native's `lineHeight` is absolute, not a multiplier, and — unlike
 * `fontSize` — it does NOT scale with the OS font-size setting. An absolute
 * leading therefore clips as soon as the user raises text size. Every role
 * multiplies its line height by `PixelRatio.getFontScale()` here so the designed
 * ratio survives all the way to AX5 rather than the glyphs growing inside a
 * fixed box.
 *
 * ── The old variant names still work ────────────────────────────────────────
 * `bodyMuted` is an alias kept so the ~30 screens not yet rebuilt keep
 * compiling and pick up the new scale for free. It is removed with the last of
 * them.
 */

type LegacyVariant = 'bodyMuted';
export type Variant = TypeRole | LegacyVariant;

interface Props extends TextProps {
  variant?: Variant;
  /** Overrides the role's default colour. Prefer the role's default. */
  color?: string;
  center?: boolean;
}

/** Every role's default colour, so no screen has to remember that captions are secondary. */
const roleColor: Record<TypeRole, string> = {
  display: theme.content.primary,
  title: theme.content.primary,
  heading: theme.content.primary,
  headingSm: theme.content.primary,
  figure: theme.content.primary,
  section: theme.content.tertiary,
  eyebrow: theme.content.accent,
  subheading: theme.content.primary,
  body: theme.content.primary,
  bodyLead: theme.content.onSurface,
  bodySm: theme.content.primary,
  caption: theme.content.secondary,
  captionSm: theme.content.tertiary,
  micro: theme.content.tertiary,
  label: theme.content.primary,
  tabLabel: theme.content.tertiary,
};

function resolveRole(variant: Variant): { role: TypeRole; color: string } {
  if (variant === 'bodyMuted') return { role: 'body', color: theme.content.secondary };
  return { role: variant, color: roleColor[variant] };
}

export function AppText({ variant = 'body', color, center, style, ...rest }: Props) {
  const { role, color: defaultColor } = resolveRole(variant);
  const base = resolveType(role);

  // See the note above: fontSize scales with the OS setting and lineHeight does not.
  const fontScale = PixelRatio.getFontScale();
  const scaled: TextStyle = {
    ...base,
    ...(base.lineHeight === undefined ? {} : { lineHeight: Math.round(base.lineHeight * fontScale) }),
  };

  return (
    <Text
      style={[scaled, styles.align, { color: color ?? defaultColor }, center ? styles.center : null, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  /**
   * `auto`, stated rather than assumed.
   *
   * React Native's default already IS `auto`, and `auto` is the RTL-correct
   * value: it follows the writing direction, so Arabic aligns right and English
   * aligns left with no branching.
   *
   * It is written down anyway for two reasons. The wrong "fix" here is
   * seductive — someone reading "set textAlign explicitly" reaches for `left`,
   * which pins Arabic to the wrong edge and looks fine in every English
   * screenshot. And RN has no `start`/`end` for textAlign, so `auto` is the
   * logical value; a reader looking for one needs to find it named.
   */
  align: { textAlign: 'auto' },
  center: { textAlign: 'center' },
});

import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { AppText } from './Typography';
import { controlHeight, elevation, radius, space, theme } from '../../theme';

interface Props extends TextInputProps {
  /**
   * OPTIONAL. Four call sites previously passed `label=""` purely to satisfy a
   * required prop, which rendered an empty text node that still reserved layout.
   */
  label?: string;
  error?: string | null;
  /** Guidance shown under the field while it is valid. Replaced by `error` when there is one. */
  helperText?: string;
  /** Shows "n / maxLength" under the field. Requires `maxLength`. */
  counter?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * ── Focus is the whole point of this rewrite ────────────────────────────────
 * The previous field used `colors.border` at rest AND when focused, so there was
 * no way to see which field you were in (audit P1-3). Focus is now a 1px gold
 * border plus a 3px gold halo, drawn as an absolutely-positioned sibling so it
 * adds no layout and cannot nudge the text.
 *
 * ── The border is a control boundary, not a divider ─────────────────────────
 * It uses `theme.border.control` (3.17:1 over the inset fill), not
 * `theme.border.hairline` (1.42:1). A text field's edge IS its affordance, so
 * WCAG 1.4.11 applies to it; a card's edge is decorative and exempt. That
 * distinction is why there are two border tokens.
 *
 * ── multiline is first-class ────────────────────────────────────────────────
 * `details.tsx` previously passed `minHeight`, `textAlignVertical` and
 * `paddingTop` in as inline overrides, which leaked this component's internals
 * into a screen.
 */
export function TextField({
  label,
  error,
  helperText,
  counter,
  containerStyle,
  style,
  multiline,
  maxLength,
  value,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const invalid = Boolean(error);
  const message = error ?? helperText;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <AppText variant="micro" style={styles.label}>
          {label}
        </AppText>
      ) : null}

      <View>
        <TextInput
          value={value}
          multiline={multiline}
          maxLength={maxLength}
          placeholderTextColor={theme.content.tertiary}
          selectionColor={theme.content.accent}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label}
          /*
           * React Native 0.86 has no `accessibilityState.invalid` and no
           * `aria-invalid` — checked against the shipped typings, not assumed.
           * So invalidity is carried in the hint, which is what actually gets
           * announced: without this the error text below the field is a separate
           * node a screen-reader user may never reach, and the field itself
           * announces as fine.
           */
          accessibilityHint={error ?? helperText}
          style={[
            styles.input,
            multiline ? styles.multiline : null,
            invalid ? styles.invalid : focused ? styles.focused : null,
            style,
          ]}
          {...rest}
        />
        {focused && !invalid ? <View style={styles.halo} pointerEvents="none" /> : null}
      </View>

      {message ? (
        <AppText
          variant="captionSm"
          color={invalid ? theme.content.danger : theme.content.tertiary}
          style={styles.message}
        >
          {message}
        </AppText>
      ) : null}

      {counter && maxLength ? (
        <AppText variant="captionSm" style={styles.counter}>
          {`${value?.length ?? 0} / ${maxLength}`}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: space.md },
  label: { marginBottom: space.sm },
  input: {
    ...elevation.inset,
    minHeight: controlHeight.field,
    borderRadius: radius.sm,
    color: theme.content.primary,
    paddingHorizontal: 15,
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
  },
  multiline: {
    minHeight: 96,
    paddingTop: space.smd,
    textAlignVertical: 'top',
  },
  focused: { borderColor: theme.border.selected },
  invalid: { borderColor: theme.border.danger },
  halo: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    left: -3,
    right: -3,
    borderRadius: radius.sm + 3,
    borderWidth: 3,
    borderColor: theme.border.focusHalo,
  },
  message: { marginTop: space.xs },
  counter: { marginTop: space.xs, textAlign: 'right' },
});

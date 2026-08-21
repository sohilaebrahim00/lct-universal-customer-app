import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './Typography';
import { radius, theme } from '../../theme';

export type AvatarSize = 'sm' | 'md' | 'lg';

interface Props {
  /** Used for the initials fallback and for the accessible name. */
  name?: string | null;
  uri?: string | null;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle & ImageStyle>;
}

const DIMENSION: Record<AvatarSize, number> = { sm: 38, md: 40, lg: 50 };
const TEXT: Record<AvatarSize, 'captionSm' | 'caption' | 'subheading'> = {
  sm: 'caption',
  md: 'caption',
  lg: 'subheading',
};

/**
 * Initials are derived from the first and last word of the name — "Michael
 * Okafor" → "MO", "Daniel A." → "DA". A single-word name yields one letter
 * rather than a padded pair.
 *
 * There is no generic person glyph fallback: an avatar with no name and no image
 * renders an empty ring, because a stock silhouette in a chauffeur product reads
 * as a missing record rather than as a person.
 */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, uri, size = 'md', style }: Props) {
  const dimension = DIMENSION[size];
  const shape = { width: dimension, height: dimension, borderRadius: radius.full } as const;
  const initials = name ? initialsOf(name) : '';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[shape, style as StyleProp<ImageStyle>]}
        accessibilityLabel={name ?? undefined}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={[shape, styles.fallback, style as StyleProp<ViewStyle>]}
      accessible={Boolean(name)}
      accessibilityRole="image"
      accessibilityLabel={name ?? undefined}
    >
      {initials ? (
        <AppText variant={TEXT[size]} color={theme.content.accentSoft}>
          {initials}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: theme.background.tertiary,
    borderWidth: 1,
    borderColor: theme.border.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

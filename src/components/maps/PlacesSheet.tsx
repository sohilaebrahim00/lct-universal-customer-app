import { Pressable, StyleSheet, View } from 'react-native';
import { Clock, Home, MapPin, Star } from 'lucide-react-native';
import { AppText } from '../ui/Typography';
import { iconSize, iconStroke, radius, space, theme } from '../../theme';
import type { RecentPlace } from '../../lib/recentPlaces';
import type { SavedLocation } from '../../types/api';

/**
 * Saved and recent places, in the sheet.
 *
 * ── Why they belong here and not behind the search field ────────────────────
 * Most journeys a customer books are to somewhere they have already been. Home,
 * the office, the airport. Making them type an address they have typed before —
 * on a phone, possibly in a car — is the single most avoidable friction in the
 * flow, and it is why every mature product in this category puts these two
 * lists first.
 *
 * ── One tap commits ─────────────────────────────────────────────────────────
 * These rows do NOT just fill the search box. A saved place already has its
 * address and its coordinates; asking the customer to confirm a location they
 * chose by name is a step that exists only because it was easier to build.
 *
 * ── Recents can lack coordinates ────────────────────────────────────────────
 * A booking made through the manual-entry fallback stores an address and no
 * point. Those rows still work — the caller geocodes on selection — which is
 * why `lat`/`lng` are nullable here rather than assumed.
 */

export interface PlacesSheetProps {
  saved: SavedLocation[];
  recent: RecentPlace[];
  onSelect: (place: { address: string; lat: number | null; lng: number | null }) => void;
}

/** Home and work get their own icons; everything else is a pin. */
function iconFor(label: string) {
  const l = label.toLowerCase();
  if (l.includes('home')) return Home;
  if (l.includes('work') || l.includes('office') || l.includes('hq')) return Star;
  return MapPin;
}

export function PlacesSheet({ saved, recent, onSelect }: PlacesSheetProps) {
  if (saved.length === 0 && recent.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {saved.length > 0 ? (
        <>
          <AppText variant="micro" style={styles.heading}>
            Saved
          </AppText>
          {saved.map((location) => (
            <PlaceRow
              key={location.id}
              icon={iconFor(location.label)}
              title={location.label}
              subtitle={location.address}
              onPress={() => onSelect({ address: location.address, lat: location.lat, lng: location.lng })}
            />
          ))}
        </>
      ) : null}

      {recent.length > 0 ? (
        <>
          <AppText variant="micro" style={[styles.heading, saved.length > 0 ? styles.headingSpaced : null]}>
            Recent
          </AppText>
          {recent.map((place) => (
            <PlaceRow
              key={place.id}
              icon={Clock}
              title={place.address}
              onPress={() => onSelect({ address: place.address, lat: place.lat, lng: place.lng })}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

function PlaceRow({
  icon: Icon,
  title,
  subtitle,
  onPress,
}: {
  icon: typeof MapPin;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      {/* content.secondary, never gold — the accent is the action, not the icon. */}
      <Icon size={iconSize.md} color={theme.content.secondary} strokeWidth={iconStroke.decorative} />
      <View style={styles.text}>
        <AppText variant="body" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="captionSm" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.sm },
  heading: { marginBottom: space.xs },
  headingSpaced: { marginTop: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.smd,
    // 44 is the floor everywhere in the client app; these are list rows a
    // thumb reaches for, so they get it exactly.
    minHeight: 44,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
  },
  text: { flex: 1 },
  pressed: { backgroundColor: theme.background.pressedOverlay },
});

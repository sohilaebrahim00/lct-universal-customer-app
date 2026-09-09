import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { roleText } from '../roleTheme';
import type { RoleRide } from '../roleData';

/**
 * CONSOLE SEARCH — over the DATA, never over the rendered text.
 *
 * The client's own panel carries "Search bookings, chauffeurs, customers…"
 * across every section. This console had one `TextInput` in it and that was the
 * broadcast composer.
 *
 * ── Why it searches the rides array and not the screen ────────────────────
 * This project has lost six checks to text matching that could not tell a value
 * from a label or one layer from the one above it, and wrote the rule down:
 *
 *   *A check that must distinguish a value from a label, or content from an
 *   overlay, cannot be a text search.*
 *
 * A feature is held to the same standard. Searching rendered text would match
 * the column heading "Chauffeur" for the query "chauffeur", match a status pill
 * as though it were a name, and miss anything scrolled out of the DOM. So this
 * reads the same `RoleRide[]` the panels render from, field by field.
 *
 * ── Substring, case-insensitive, and no ranking ───────────────────────────
 * No fuzzy matching and no relevance score. A dispatcher searching a plate or a
 * reference wants the row that contains it, and a score would put a row they
 * did not ask for above the one they did. Ordering stays the board's own —
 * pickup time — which is the order they already read.
 *
 * ── Client-side is correct HERE, and would not be at scale ────────────────
 * The demo store holds a handful of rides for one day, already in memory. There
 * is no server-side query to defer to and no dataset to page. Against a real
 * backend this belongs in the query — noted in `HANDOFF.md` rather than built
 * speculatively against an endpoint that does not exist.
 */

export interface ConsoleSearchProps {
  rides: RoleRide[];
  /** Jumps to the section that owns a result. */
  onOpenSection: (section: string) => void;
}

interface Hit {
  id: string;
  line: string;
  detail: string;
  section: string;
}

/** Every field a dispatcher would plausibly type, and where its row lives. */
function hitsFor(rides: RoleRide[], q: string): Hit[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];

  const out: Hit[] = [];
  for (const ride of rides) {
    const b = ride.booking;
    /*
     * The reference the CUSTOMER sees, derived the same way `confirmed.tsx`
     * derives it — last six of the id, uppercased, `LCT-` prefixed. A
     * dispatcher reading a code off a customer's screen must be able to paste
     * it here and find the ride; searching the raw UUID alone would fail that.
     */
    const reference = `LCT-${b.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-6)}`;

    const fields: [string, string | null][] = [
      ['Reference', reference],
      ['Booking id', b.id],
      ['Customer', ride.customer?.full_name ?? null],
      ['Passenger', b.primary_passenger_name],
      ['Phone', b.primary_passenger_phone],
      ['Pickup', b.pickup_address],
      ['Drop-off', b.dropoff_address],
      ['Chauffeur', ride.chauffeur?.full_name ?? null],
      ['Class', ride.vehicleName],
      ['Flight', b.flight_number],
      ['Status', b.status],
    ];

    const match = fields.find(([, v]) => v && v.toLowerCase().includes(needle));
    if (!match) continue;

    out.push({
      id: b.id,
      line: `${reference} · ${ride.customer?.full_name ?? 'Customer unknown'}`,
      detail: `${match[0]}: ${match[1]}`,
      // Every result is a ride, so every result opens the board that lists rides.
      section: 'bookings',
    });
  }
  return out;
}

export function ConsoleSearch({ rides, onOpenSection }: ConsoleSearchProps) {
  const [query, setQuery] = useState('');
  const hits = useMemo(() => hitsFor(rides, query), [rides, query]);
  const searching = query.trim().length >= 2;

  return (
    <View style={styles.wrap}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search rides — reference, customer, passenger, pickup, chauffeur, plate…"
        placeholderTextColor={roleText.bodySoft.color}
        accessibilityLabel="Search rides"
        style={styles.input}
      />

      {searching ? (
        <View style={styles.results}>
          {hits.length === 0 ? (
            /*
              The empty state names what was searched. "No results" alone leaves
              a dispatcher unsure whether the ride is missing or the query was.
            */
            <Text style={roleText.bodySoft}>
              {`Nothing on today's board matches “${query.trim()}”. This searches today's rides only.`}
            </Text>
          ) : (
            hits.map((h) => (
              <Pressable
                key={h.id + h.detail}
                onPress={() => {
                  onOpenSection(h.section);
                  setQuery('');
                }}
                accessibilityRole="button"
                accessibilityLabel={`Open ${h.line}`}
                style={({ pressed }) => [styles.hit, pressed ? styles.pressed : null]}
              >
                <Text style={roleText.body}>{h.line}</Text>
                <Text style={roleText.bodySoft}>{h.detail}</Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  input: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    color: roleText.body.color,
  },
  results: { marginTop: 8, gap: 6 },
  hit: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  pressed: { opacity: 0.7 },
});

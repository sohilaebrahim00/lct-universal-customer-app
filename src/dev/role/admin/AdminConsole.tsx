import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { radius, space } from '../../../theme/ref';
import { roleColor, roleTarget, roleText } from '../roleTheme';
import { RoleShell } from '../RoleShell';
import { type RoleRide, loadRides } from '../roleData';
import { Bookings, ClassBuilder, Chauffeurs, Empty, Fleet, LiveDispatch, Notifications, Overview } from './AdminPanels';

/**
 * ADMIN CONSOLE — a preview, not a replacement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  THE CLIENT ALREADY RUNS AN OPERATIONS PANEL AT lctuniversal.us/admin.
 *  THIS IS NOT IT, DOES NOT TALK TO IT, AND IS NOT A REPLACEMENT FOR IT.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * It exists so the client can see the same capability in this product's design
 * language and decide what they want built. It lives behind the `app/_role/`
 * fence, which is stripped from a non-demo bundle, and every screen says what
 * it is.
 *
 * ── What it writes ─────────────────────────────────────────────────────────
 * ONE thing: chauffeur assignment, through `assignChauffeur()` in Live
 * Dispatch. That is dispatch's actual job, the function already exists, and it
 * already moves the customer's tracking screen — the same write the dispatcher
 * preview has been making since the role slice.
 *
 * Everything else OBSERVES. It reads the same `rideStage` machine the three
 * role views read, and the same demo store. Class Builder appears to edit and
 * does not: its changes live in component state, are never persisted, and are
 * lost on reload, which the screen states in words.
 *
 * That boundary is deliberate. A console that can quietly rewrite pricing or
 * fleet data is a console that can put an unconfirmed figure in front of a
 * customer, which is the one thing this codebase spends a lint rule and two
 * test files preventing.
 */

type SectionKey =
  | 'overview'
  | 'dispatch'
  | 'fleet'
  | 'classes'
  | 'chauffeurs'
  | 'bookings'
  | 'notifications'
  | 'users'
  | 'ratings'
  | 'revenue'
  | 'promotions'
  | 'coverage'
  | 'messages'
  | 'broadcast'
  | 'support'
  | 'settings';

const NAV: { key: SectionKey; label: string }[] = [
  // In the order the recording showed them working.
  { key: 'overview', label: 'Overview' },
  { key: 'dispatch', label: 'Live Dispatch' },
  { key: 'fleet', label: 'Fleet' },
  { key: 'classes', label: 'Class Builder' },
  { key: 'chauffeurs', label: 'Chauffeurs' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'notifications', label: 'Notifications' },
  // Navigation with designed empty states, not invented dashboards.
  { key: 'users', label: 'Users & Roles' },
  { key: 'ratings', label: 'Ratings' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'promotions', label: 'Promotions' },
  { key: 'coverage', label: 'Coverage' },
  { key: 'messages', label: 'Messages' },
  { key: 'broadcast', label: 'Push Broadcast' },
  { key: 'support', label: 'Support' },
  { key: 'settings', label: 'Settings' },
];

/**
 * What each unbuilt panel would need.
 *
 * Written per panel rather than as one generic "coming soon", because the
 * useful information is not that it is empty — it is WHICH missing thing keeps
 * it empty. Every line here names a table, an endpoint or an open question.
 */
const EMPTY: Record<string, { what: string; needs: string }> = {
  users: {
    what: 'No users or roles',
    needs:
      'This app authenticates customers through Supabase and has no concept of staff accounts, roles or permissions. An admin console needs a role model before it can have a users screen.',
  },
  ratings: {
    what: 'No ratings collected',
    needs:
      'The customer app can capture a rating on a completed trip, and there is nowhere to store it — chauffeurs carry no rating column. See BACKEND_FOLLOWUPS.md §2.',
  },
  revenue: {
    what: 'No revenue data',
    needs:
      'Would need a payments or invoices table. A booking records a fare; nothing aggregates one. A chart here would be a number nobody computed.',
  },
  promotions: {
    what: 'No promotions',
    needs:
      'A `promo_codes` table exists server-side and `discount_amount` arrives on a priced booking, but this app has no endpoint to list or create a code, and no customer-facing way to enter one.',
  },
  coverage: {
    what: 'No coverage areas',
    needs:
      'The app has no service-area concept. `isMapsConfigured()` gates map features, not geography, so it cannot tell a customer they are outside coverage.',
  },
  messages: {
    what: 'No messaging',
    needs:
      'There is no chauffeur-to-client messaging system — see BACKEND_FOLLOWUPS.md C-5. "I am in the third lane by column C" has nowhere to go.',
  },
  broadcast: {
    what: 'No broadcast history',
    needs:
      'Push exists for the customer app through expo-notifications, but there is no fleet-wide broadcast endpoint and no record of what was sent.',
  },
  support: {
    what: 'No support tickets',
    needs:
      'Support today is the dispatch phone number in servicePolicy. There is no ticket store, so there is nothing to list.',
  },
  settings: {
    what: 'Settings are code, not data',
    needs:
      'Cancellation windows, waiting windows and the dispatch number live in src/config/servicePolicy.ts with their source and confirmation date. Making them editable here would move a confirmed business fact into demo memory.',
  },
};

export function AdminConsole() {
  const [section, setSection] = useState<SectionKey>('overview');
  const [rides, setRides] = useState<RoleRide[] | null>(null);

  const reload = useCallback(() => {
    void loadRides(new Date()).then(setRides);
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const current = NAV.find((n) => n.key === section);

  return (
    <RoleShell title={`Admin · ${current?.label ?? ''}`} note={NOTE}>
      {/* Horizontal nav. Scrolls because sixteen sections do not fit a phone. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.nav}
        // Without this the nav is a keyboard trap on web: the sections after
        // the fold cannot be reached by tab.
        accessibilityRole="tablist"
      >
        {NAV.map((n) => {
          const active = n.key === section;
          return (
            <Pressable
              key={n.key}
              onPress={() => setSection(n.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={n.label}
              style={({ pressed }) => [styles.tab, active ? styles.tabActive : null, pressed ? styles.pressed : null]}
            >
              <Text style={active ? roleText.body : roleText.bodySoft}>{n.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {rides === null ? (
        <Text style={roleText.bodySoft}>Loading…</Text>
      ) : section === 'overview' ? (
        <Overview rides={rides} />
      ) : section === 'dispatch' ? (
        <LiveDispatch rides={rides} onChanged={reload} />
      ) : section === 'fleet' ? (
        <Fleet />
      ) : section === 'classes' ? (
        <ClassBuilder />
      ) : section === 'chauffeurs' ? (
        <Chauffeurs rides={rides} />
      ) : section === 'bookings' ? (
        <Bookings rides={rides} />
      ) : section === 'notifications' ? (
        <Notifications rides={rides} />
      ) : (
        <Empty what={EMPTY[section]?.what ?? 'Nothing here'} needs={EMPTY[section]?.needs ?? ''} />
      )}
    </RoleShell>
  );
}

const NOTE =
  'Preview of an admin console LCT does not have in this product. The client already runs an operations panel at lctuniversal.us/admin — this is not it and does not connect to it. Same demo data as the client app; only chauffeur assignment writes.';

const styles = StyleSheet.create({
  nav: { gap: space.xs, paddingBottom: space.mdl },
  tab: {
    minHeight: roleTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.mdl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: roleColor.hairline,
  },
  tabActive: { borderColor: roleColor.accent },
  pressed: { opacity: 0.85 },
});

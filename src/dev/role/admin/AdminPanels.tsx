import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { radius, space } from '../../../theme/ref';
import { formatCurrency, formatTimeOfDay } from '../../../lib/format';
import { roleColor, roleLayout, roleTarget, roleText } from '../roleTheme';
import { type RoleRide, stageLabel } from '../roleData';
import { DEMO_CHAUFFEURS, DEMO_VEHICLES } from '../../demoData';
import { assignChauffeur } from '../../demoApi';
import { OBSERVED_RATE_CARDS, OBSERVED_RATE_CARD_SOURCE } from '../../../config/observedRateCards';
import { PUBLISHED_STARTING_LABELS, WEBSITE_CLASSES_WITHOUT_BACKEND_EQUIVALENT } from '../../../config/publishedFleet';
import type { RateCard } from '../../../config/rateCard';
import { SERVICE_AREA_CITY_COUNT, SERVICE_AREA_SOURCE, SERVICE_REGIONS } from '../../../config/serviceAreas';

/**
 * ADMIN CONSOLE PANELS.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  A PANEL WITH NO DATA GETS AN EMPTY STATE THAT SAYS WHAT WOULD FILL IT.
 *  NEVER A PLAUSIBLE NUMBER.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * An admin console is where fabrication is most tempting, because plausible
 * figures are exactly what make one look finished. A revenue chart with no
 * revenue data is not a placeholder — it is a fabrication with axes on it.
 *
 * This project has already deleted an invented chauffeur, invented
 * testimonials, an invented rating and an invented plate. Every one of them
 * would have looked at home on a dashboard. So `Empty` is used wherever the
 * data does not exist, and it names the source that would supply it.
 */

/* ── shared pieces ───────────────────────────────────────────────────────── */

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[roleText.label, styles.sectionLabel]}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * The designed empty state.
 *
 * `needs` is not decoration: it is the whole point. "No data" tells an operator
 * nothing; "needs a `payments` table this app has never queried" tells them
 * what to go and build.
 */
export function Empty({ what, needs }: { what: string; needs: string }) {
  return (
    <View style={styles.empty}>
      <Text style={roleText.heading}>{what}</Text>
      <Text style={[roleText.bodySoft, styles.emptyNeeds]}>{needs}</Text>
    </View>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone?: 'warning' | 'danger' }) {
  return (
    <View style={styles.stat}>
      <Text style={[roleText.hero, tone === 'danger' ? styles.danger : tone === 'warning' ? styles.warn : null]}>
        {n}
      </Text>
      <Text style={roleText.bodySoft}>{label}</Text>
    </View>
  );
}

/* ── 1. Overview ─────────────────────────────────────────────────────────── */

/**
 * The client's own panel counts an order board seven ways: live, unassigned,
 * scheduled, on-the-road, stale, completed, cancelled. All seven are
 * computable from data this app already has (`booking.status`, `chauffeur`,
 * the existing `late` flag) — no new field, no new source. Added 2026-09-01
 * rather than left at the four-stat version, which is the same undercount
 * this file's own header warns against: not fabricated, just incomplete
 * next to what was actually asked for.
 */
function orderBoardCounts(rides: RoleRide[]) {
  const unassigned = rides.filter((r) => !r.chauffeur).length;
  const scheduled = rides.filter((r) => r.booking.status === 'driver_assigned').length;
  const onTheRoad = rides.filter((r) =>
    ['driver_arriving', 'passenger_picked_up', 'trip_started'].includes(r.booking.status),
  ).length;
  const stale = rides.filter((r) => r.late).length;
  const completed = rides.filter((r) => r.booking.status === 'completed').length;
  const cancelled = rides.filter((r) => r.booking.status === 'cancelled').length;
  const live = rides.filter((r) => !['completed', 'cancelled'].includes(r.booking.status)).length;
  return { unassigned, scheduled, onTheRoad, stale, completed, cancelled, live };
}

export function Overview({ rides }: { rides: RoleRide[] }) {
  const c = orderBoardCounts(rides);

  return (
    <>
      <Section title="Today">
        <View style={styles.statRow}>
          <Stat n={rides.length} label="rides today" />
          <Stat n={c.live} label="live" />
          <Stat n={c.unassigned} label="unassigned" tone={c.unassigned > 0 ? 'warning' : undefined} />
          <Stat n={c.scheduled} label="scheduled" />
          <Stat n={c.onTheRoad} label="on the road" />
          <Stat n={c.stale} label="stale" tone={c.stale > 0 ? 'danger' : undefined} />
          <Stat n={c.completed} label="completed" />
          <Stat n={c.cancelled} label="cancelled" />
        </View>
        {/*
          Counted from the same rides the board renders, not from a separate
          figure. Two numbers for one fact is how a dashboard starts lying.
        */}
        <Text style={[roleText.bodySoft, styles.note]}>
          Counted from the same rides Live Dispatch lists. No separate source.
        </Text>
      </Section>

      <Section title="Revenue">
        <Empty
          what="No revenue data"
          needs="Would need a payments or invoices table. This app records a fare on a booking and never queries a total — so any chart here would be a number nobody computed."
        />
      </Section>

      <Section title="Ratings">
        <Empty
          what="No ratings collected"
          needs="The customer app can capture a rating on a completed trip, but there is nowhere to send it: chauffeurs carry no rating column. See BACKEND_FOLLOWUPS.md §2."
        />
      </Section>
    </>
  );
}

/* ── 2. Live Dispatch ────────────────────────────────────────────────────── */

/**
 * The one panel that WRITES.
 *
 * Assignment is dispatch's actual job, and `assignChauffeur()` already exists —
 * it is what the dispatcher preview uses, and it already moves the customer's
 * tracking screen. Everything else in this console observes.
 *
 * Cars matching the ordered class are offered first, and the rest are labelled
 * rather than hidden: dispatch sometimes has to send what is available, and a
 * tool that silently omits the option is a tool that gets worked around.
 */
export function LiveDispatch({ rides, onChanged }: { rides: RoleRide[]; onChanged: () => void }) {
  const [assigning, setAssigning] = useState<string | null>(null);

  if (rides.length === 0) {
    return <Empty what="No rides today" needs="Rides appear here as they are booked in the customer app." />;
  }

  return (
    <Section title="Order board">
      {rides.map((ride) => {
        const open = assigning === ride.booking.id;
        return (
          <View key={ride.booking.id} style={[styles.row, ride.late ? styles.rowLate : null]}>
            <View style={styles.rowHead}>
              <Text style={roleText.heading}>{formatTimeOfDay(new Date(ride.booking.scheduled_at))}</Text>
              <Text style={roleText.bodySoft}>{stageLabel(ride.booking)}</Text>
            </View>
            <Text style={roleText.body} numberOfLines={2}>
              {[ride.booking.pickup_address, ride.booking.dropoff_address].filter(Boolean).join(' → ')}
            </Text>
            <Text style={roleText.bodySoft}>
              {ride.vehicleName} · {ride.chauffeur?.full_name ?? 'Unassigned'}
            </Text>

            <Pressable
              onPress={() => setAssigning(open ? null : ride.booking.id)}
              accessibilityRole="button"
              accessibilityLabel={open ? 'Close assign' : `Assign a chauffeur to the ${formatTimeOfDay(new Date(ride.booking.scheduled_at))} ride`}
              style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
            >
              <Text style={roleText.body}>{open ? 'Close' : ride.chauffeur ? 'Reassign' : 'Assign chauffeur'}</Text>
            </Pressable>

            {open ? (
              <View style={styles.assignList}>
                {DEMO_CHAUFFEURS.map((c) => {
                  // "Matching" means attached to the ordered class. No such
                  // attachment exists in this data, so every chauffeur is
                  // labelled honestly rather than sorted by an invented field.
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        assignChauffeur(ride.booking.id, c.id);
                        setAssigning(null);
                        onChanged();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Assign ${c.full_name}`}
                      style={({ pressed }) => [styles.assignRow, pressed ? styles.pressed : null]}
                    >
                      <Text style={roleText.body}>{c.full_name}</Text>
                      <Text style={roleText.bodySoft}>class attachment unknown</Text>
                    </Pressable>
                  );
                })}
                <Text style={[roleText.bodySoft, styles.note]}>
                  The panel groups chauffeurs by the class they are attached to. This app has no
                  chauffeur-to-class field, so none is shown rather than guessed.
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}

      {/*
        THE OPERATIONS PANEL HAS A ZONE-FLAGGING FEATURE. THIS CONSOLE DOES NOT
        SHOW IT, AND THE REASON IS WORTH RECORDING.
       *
        A panel was written here — an empty state saying the feature exists
        upstream and that whether it affects price is unanswered. It failed
        `tests/quoteIsNotScaled.test.ts`, which forbids that vocabulary anywhere
        in `app/` or `src/` outside comments.
       *
        The guard was right and the panel was wrong. That test exists so a
        price multiplier cannot arrive quietly, and the correct response to it
        firing is not a narrow exemption for a decorative empty state that
        nobody asked for. The information it carried already lives where it
        belongs: `PLATFORM_RECONCILIATION.md` Q4 and the blocked-on-the-business
        list in `HANDOFF.md`.
       *
        A guard that pushes back on a cosmetic addition is doing exactly what it
        was built for, and the addition is what yields.
      */}
    </Section>
  );
}

/* ── 3. Fleet ────────────────────────────────────────────────────────────── */

export function Fleet() {
  return (
    <Section title="Fleet">
      {DEMO_VEHICLES.map((v) => (
        <View key={v.id} style={styles.row}>
          <Text style={roleText.heading}>{v.name}</Text>
          <Text style={roleText.bodySoft}>{v.description}</Text>
          <Text style={roleText.bodySoft}>
            {v.capacity_passengers} passengers · {v.capacity_luggage} bags
          </Text>
          {/*
            Plate and colour are NULL on every row, in the demo and in
            production, because `vehicles` is a fare-class table and there is no
            physical car to describe. The panel shows plates; this app cannot,
            and says so rather than leaving a blank cell.
          */}
          <Text style={[roleText.bodySoft, styles.missing]}>
            No plate or colour — `vehicles` is a fare class, not a car. See BACKEND_FOLLOWUPS.md §1.
          </Text>
        </View>
      ))}
    </Section>
  );
}

/* ── 4. Class Builder ────────────────────────────────────────────────────── */

/**
 * READS `observedRateCards.ts` AND NOTHING ELSE.
 *
 * Those five rate cards were transcribed from a phone recording of the client's
 * operations panel. Unconfirmed, and materially different from what the
 * marketing site publishes. The containment rule in `eslint.config.js` permits
 * this import because `src/dev/` is the preview layer and nothing here reaches
 * a paying customer — and `tests/observedRateCardContainment.test.ts` fails the
 * build if the same import appears under `app/`.
 *
 * EDITS LIVE IN MEMORY ONLY. They are never persisted, never written to
 * `src/config`, and are lost on reload. The screen says so in words, because a
 * console that silently discards an operator's edit is worse than one that
 * cannot edit at all.
 */
export function ClassBuilder() {
  const [draft, setDraft] = useState<RateCard[]>(() => OBSERVED_RATE_CARDS.map((c) => ({ ...c })));
  const [touched, setTouched] = useState(false);

  function bump(key: string, delta: number) {
    setTouched(true);
    setDraft((prev) => prev.map((c) => (c.classKey === key ? { ...c, minimumFare: Math.max(0, c.minimumFare + delta) } : c)));
  }

  return (
    <>
      <View style={styles.warning}>
        <Text style={roleText.heading}>Preview data — not confirmed</Text>
        <Text style={[roleText.bodySoft, styles.emptyNeeds]}>
          Read off a phone recording of {OBSERVED_RATE_CARD_SOURCE.source.split(',')[0]} on{' '}
          {OBSERVED_RATE_CARD_SOURCE.readOn}. Nobody has confirmed these figures, and they are never
          shown to a customer.
        </Text>
        <Text style={[roleText.bodySoft, styles.emptyNeeds]}>
          Edits here live in memory only. They are not saved, not written to the app&apos;s
          configuration, and are lost when this page reloads.
        </Text>
        {touched ? (
          <Text style={[roleText.body, styles.unsaved]} accessibilityLiveRegion="polite">
            Unsaved — and it will stay that way. Nothing on this screen persists.
          </Text>
        ) : null}
      </View>

      <Section title="Classes">
        {draft.map((c) => (
          <View key={c.classKey} style={styles.row}>
            <View style={styles.rowHead}>
              <Text style={roleText.heading}>{c.displayName}</Text>
              {c.tierTag ? <Text style={roleText.label}>{c.tierTag}</Text> : null}
            </View>
            <Text style={roleText.bodySoft}>{c.exampleVehicle}</Text>
            <Text style={roleText.bodySoft}>
              base {formatCurrency(c.baseFare)} · {formatCurrency(c.perMile)}/mi ·{' '}
              {formatCurrency(c.perMinute)}/min · {formatCurrency(c.perHour)}/hr
            </Text>
            <Text style={roleText.bodySoft}>
              {c.seats} seats · {c.bags === null ? 'bag capacity not shown' : `${c.bags} bags`} ·{' '}
              {c.configuredEtaMinutes === null ? 'no configured ETA' : `${c.configuredEtaMinutes} min configured ETA`}
            </Text>

            <View style={styles.bumpRow}>
              <Text style={roleText.body}>Minimum {formatCurrency(c.minimumFare)}</Text>
              <Pressable
                onPress={() => bump(c.classKey, -5)}
                accessibilityRole="button"
                accessibilityLabel={`Decrease ${c.displayName} minimum fare by five dollars`}
                style={({ pressed }) => [styles.bump, pressed ? styles.pressed : null]}
              >
                <Text style={roleText.heading}>−</Text>
              </Pressable>
              <Pressable
                onPress={() => bump(c.classKey, 5)}
                accessibilityRole="button"
                accessibilityLabel={`Increase ${c.displayName} minimum fare by five dollars`}
                style={({ pressed }) => [styles.bump, pressed ? styles.pressed : null]}
              >
                <Text style={roleText.heading}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </Section>

      {/*
        THE CONFLICT, SHOWN RATHER THAN RESOLVED.

        A console that shows the business its own inconsistency is doing its
        job — but only while the inconsistency it names is still real. This
        panel used to say the app itself showed two different names for this
        class ("Luxury SUV" on Fleet/Corporate, "Executive SUV" on Home/the
        booking picker). That was fixed 2026-08-28 — every screen now reads
        "Executive SUV" — and the panel kept describing the old, already-fixed
        split, which is exactly the stale-comment defect this project keeps
        finding and keeps saying it won't repeat. The conflict that is still
        real: the app's chosen name against the site's OWN two pages
        disagreeing with each other. Nothing here picks a winner — that is a
        business decision with a paying customer attached, and it is
        `OPEN_QUESTIONS.md` question 2.
      */}
      <Section title="What this app publishes for the same class">
        <View style={styles.conflict}>
          <Text style={roleText.body}>Executive SUV · {PUBLISHED_STARTING_LABELS.suv}</Text>
          <Text style={roleText.bodySoft}>
            The app shows “Executive SUV” consistently — Fleet, Corporate, Home, and the booking
            picker all agree.
          </Text>
          {WEBSITE_CLASSES_WITHOUT_BACKEND_EQUIVALENT.map((c) => (
            <Text key={c.name} style={roleText.bodySoft}>
              Site also publishes {c.name} · {c.priceLabel} — no class in this app.
            </Text>
          ))}
          <Text style={[roleText.body, styles.unsaved]}>
            lctuniversal.com itself disagrees with itself: /fleet calls this class “Executive SUV”,
            /rates calls it “SUV”. The app uses /fleet&apos;s name. Unresolved on purpose — see
            OPEN_QUESTIONS.md #2.
          </Text>
        </View>
      </Section>
    </>
  );
}

/* ── 5. Chauffeurs ───────────────────────────────────────────────────────── */

export function Chauffeurs({ rides }: { rides: RoleRide[] }) {
  return (
    <Section title="Chauffeurs">
      {DEMO_CHAUFFEURS.map((c) => {
        const assigned = rides.filter((r) => r.chauffeur?.id === c.id).length;
        return (
          <View key={c.id} style={styles.row}>
            <Text style={roleText.heading}>{c.full_name}</Text>
            <Text style={roleText.bodySoft}>{assigned === 0 ? 'No rides today' : `${assigned} ride${assigned === 1 ? '' : 's'} today`}</Text>
            {/*
              No rating, no tenure, no trip count. `rating` is null on every row
              and `hired_at` does not exist. The panel shows all three; this app
              shows none rather than three plausible numbers.
            */}
            <Text style={[roleText.bodySoft, styles.missing]}>
              No rating, tenure or lifetime trip count — none of those fields exist. See §2.
            </Text>
          </View>
        );
      })}
    </Section>
  );
}

/* ── 6. Bookings ─────────────────────────────────────────────────────────── */

export function Bookings({ rides }: { rides: RoleRide[] }) {
  if (rides.length === 0) {
    return <Empty what="No bookings" needs="Bookings made in the customer app appear here." />;
  }
  return (
    <Section title="Bookings">
      {rides.map((r) => (
        <View key={r.booking.id} style={styles.row}>
          <View style={styles.rowHead}>
            <Text style={roleText.heading}>{formatTimeOfDay(new Date(r.booking.scheduled_at))}</Text>
            <Text style={roleText.bodySoft}>{stageLabel(r.booking)}</Text>
          </View>
          <Text style={roleText.body} numberOfLines={2}>
            {[r.booking.pickup_address, r.booking.dropoff_address].filter(Boolean).join(' → ')}
          </Text>
          <Text style={roleText.bodySoft}>
            {r.customer?.full_name ?? 'Customer unknown'} · {formatCurrency(r.booking.total_fare, r.booking.currency)}
          </Text>
          {/*
            The panel keys bookings on LX-XXXXXX. This app has UUIDs and has
            never seen that format. Showing a made-up LX reference to make the
            console look right would be inventing an identifier a customer might
            read out to dispatch.
          */}
          <Text style={[roleText.mono, styles.missing]}>{r.booking.id}</Text>
        </View>
      ))}
      <Text style={[roleText.bodySoft, styles.note]}>
        The operations panel references bookings as LX-XXXXXX. This app has no such identifier —
        PLATFORM_RECONCILIATION.md Q5. Its own ids are shown instead of an invented one.
      </Text>
    </Section>
  );
}

/* ── Push Broadcast ──────────────────────────────────────────────────────── */

interface SentBroadcast {
  id: string;
  audience: string;
  message: string;
  at: Date;
}

/**
 * A COMPOSER, NOT A FEATURE. IT SAYS SO ON EVERY SEND.
 *
 * The client's own panel has a working broadcast-to-fleet console. This one
 * demonstrates the same interaction — pick an audience, write a message, send
 * it — without pretending a message goes anywhere: there is no fleet-wide
 * push endpoint (`expo-notifications` only reaches the customer app) and no
 * record of what was sent. Composing and "sending" are real; delivery is not,
 * and the confirmation says exactly that every time, not just in a banner
 * someone can scroll past once.
 */
export function Broadcast({ rides }: { rides: RoleRide[] }) {
  const chauffeursOnBoard = Array.from(
    new Map(rides.filter((r) => r.chauffeur).map((r) => [r.chauffeur!.id, r.chauffeur!])).values(),
  );
  const [audience, setAudience] = useState<string | null>('all');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<SentBroadcast[]>([]);

  function audienceLabel(id: string): string {
    if (id === 'all') return `All chauffeurs on today's board (${chauffeursOnBoard.length})`;
    return chauffeursOnBoard.find((c) => c.id === id)?.full_name ?? id;
  }

  function handleSend() {
    if (!audience || !message.trim()) return;
    setSent((prev) => [{ id: `b-${Date.now()}`, audience: audienceLabel(audience), message: message.trim(), at: new Date() }, ...prev]);
    setMessage('');
  }

  return (
    <>
      <View style={styles.warning}>
        <Text style={roleText.heading}>Not connected</Text>
        <Text style={[roleText.bodySoft, styles.emptyNeeds]}>
          There is no fleet-wide push endpoint yet — composing and sending below is real, but nothing
          reaches a chauffeur&apos;s phone. Would need a server-side broadcast endpoint and a record
          of what was sent, neither of which exists today.
        </Text>
      </View>

      <Section title="Audience">
        <View style={styles.assignList}>
          <Pressable
            onPress={() => setAudience('all')}
            accessibilityRole="radio"
            accessibilityState={{ selected: audience === 'all' }}
            accessibilityLabel={`All chauffeurs, ${chauffeursOnBoard.length} on today's board`}
            style={({ pressed }) => [styles.assignRow, audience === 'all' ? styles.audienceSelected : null, pressed ? styles.pressed : null]}
          >
            <Text style={roleText.body}>All chauffeurs on today&apos;s board ({chauffeursOnBoard.length})</Text>
          </Pressable>
          {chauffeursOnBoard.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setAudience(c.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: audience === c.id }}
              accessibilityLabel={c.full_name}
              style={({ pressed }) => [styles.assignRow, audience === c.id ? styles.audienceSelected : null, pressed ? styles.pressed : null]}
            >
              <Text style={roleText.body}>{c.full_name}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Message">
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="e.g. Ice on the North Dallas Tollway — add ten minutes to any pickup there."
          placeholderTextColor={roleColor.label}
          multiline
          style={styles.broadcastInput}
          accessibilityLabel="Broadcast message"
        />
        <Pressable
          onPress={handleSend}
          disabled={!message.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send broadcast"
          style={({ pressed }) => [styles.action, !message.trim() ? styles.actionDisabled : null, pressed ? styles.pressed : null]}
        >
          <Text style={roleText.body}>Send (not delivered)</Text>
        </Pressable>
      </Section>

      {sent.length > 0 ? (
        <Section title="Sent this session">
          {sent.map((s) => (
            <View key={s.id} style={styles.row}>
              <View style={styles.rowHead}>
                <Text style={roleText.bodySoft}>{formatTimeOfDay(s.at)}</Text>
                <Text style={roleText.bodySoft}>{s.audience}</Text>
              </View>
              <Text style={roleText.body}>{s.message}</Text>
              <Text style={[roleText.bodySoft, styles.missing]}>
                Not sent anywhere — held in this browser only, gone on reload.
              </Text>
            </View>
          ))}
        </Section>
      ) : null}
    </>
  );
}

/* ── 7. Notifications ────────────────────────────────────────────────────── */

export function Notifications({ rides }: { rides: RoleRide[] }) {
  // Derived from real state, not a fixture list. An unassigned ride IS the
  // "needs a new chauffeur" notification; a cancelled one IS the cancellation.
  const items = [
    ...rides.filter((r) => !r.chauffeur).map((r) => ({ id: `u-${r.booking.id}`, text: `Needs a chauffeur — ${formatTimeOfDay(new Date(r.booking.scheduled_at))}` })),
    ...rides.filter((r) => r.late).map((r) => ({ id: `l-${r.booking.id}`, text: `Running late — ${formatTimeOfDay(new Date(r.booking.scheduled_at))}` })),
    ...rides.filter((r) => r.booking.status === 'cancelled').map((r) => ({ id: `c-${r.booking.id}`, text: `Ride cancelled — ${formatTimeOfDay(new Date(r.booking.scheduled_at))}` })),
  ];

  if (items.length === 0) {
    return <Empty what="Nothing needs attention" needs="Unassigned, late and cancelled rides appear here as they occur. Derived from the board, not a separate feed." />;
  }
  return (
    <Section title="Needs attention">
      {items.map((i) => (
        <View key={i.id} style={styles.row}>
          <Text style={roleText.body}>{i.text}</Text>
        </View>
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: space.xl },
  sectionLabel: { marginBottom: space.smd },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.mdl },
  stat: { minWidth: 92 },
  danger: { color: roleColor.danger },
  warn: { color: roleColor.accent },
  note: { marginTop: space.smd },
  missing: { marginTop: space.xs, color: roleColor.label },
  row: { ...roleLayout.card, marginBottom: space.smd, gap: space.xs },
  rowLate: { borderColor: roleColor.danger },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  action: {
    minHeight: roleTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: roleColor.hairline,
    marginTop: space.sm,
  },
  assignList: { marginTop: space.sm, gap: space.xs },
  assignRow: {
    minHeight: roleTarget.min,
    justifyContent: 'center',
    paddingHorizontal: space.smd,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: roleColor.hairline,
  },
  pressed: { opacity: 0.85 },
  empty: { ...roleLayout.card, gap: space.xs },
  emptyNeeds: { marginTop: space.xs },
  warning: { ...roleLayout.card, borderColor: roleColor.accent, marginBottom: space.xl, gap: space.xs },
  unsaved: { marginTop: space.sm, color: roleColor.accent },
  bumpRow: { flexDirection: 'row', alignItems: 'center', gap: space.smd, marginTop: space.sm },
  bump: {
    minWidth: roleTarget.min,
    minHeight: roleTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: roleColor.hairline,
  },
  conflict: { ...roleLayout.card, gap: space.xs },
  /* Wraps as one flowing line of city names rather than a column of 57 rows. */
  cities: { marginTop: space.sm, lineHeight: 26 },
  audienceSelected: { borderColor: roleColor.accent },
  actionDisabled: { opacity: 0.4 },
  broadcastInput: {
    ...roleLayout.card,
    color: roleColor.text,
    minHeight: 88,
    textAlignVertical: 'top',
    marginBottom: space.sm,
  },
});

/* ── Coverage — real, because the client publishes it ────────────────────── */

/**
 * This was an empty state saying the app had no service-area concept. That was
 * true, and the answer was on `lctuniversal.com/service-areas` the whole time:
 * fifty-seven communities in three named regions, read in full on 2026-08-26.
 *
 * Sourced and dated like every other published fact. **It does not gate
 * booking** — the site says availability is confirmed per trip, so this
 * describes where the fleet dispatches rather than who may book. Nothing in the
 * app refuses an address for being absent from this list.
 */
export function Coverage() {
  return (
    <>
      <View style={styles.warning}>
        <Text style={roleText.heading}>{`${SERVICE_AREA_CITY_COUNT} communities, as published`}</Text>
        <Text style={[roleText.bodySoft, styles.emptyNeeds]}>
          {`From ${SERVICE_AREA_SOURCE.source}, read ${SERVICE_AREA_SOURCE.readOn}.`}
        </Text>
        <Text style={[roleText.bodySoft, styles.emptyNeeds]}>{SERVICE_AREA_SOURCE.summary}</Text>
        <Text style={[roleText.bodySoft, styles.emptyNeeds]}>
          {`${SERVICE_AREA_SOURCE.availabilityNote} Nothing in the app refuses a booking outside this list.`}
        </Text>
      </View>

      {SERVICE_REGIONS.map((region) => (
        <Section key={region.name} title={region.name}>
          <View style={styles.row}>
            <Text style={roleText.bodySoft}>{region.description}</Text>
            <Text style={[roleText.body, styles.cities]}>{region.cities.join(' · ')}</Text>
          </View>
        </Section>
      ))}
    </>
  );
}

/* ── Users and Roles — the app's own role model ──────────────────────────── */

/**
 * Real, because the app already has these roles.
 *
 * `Profile.role` is `UserRole = 'customer' | 'driver' | 'admin' |
 * 'corporate_admin'` — in the API contract since the project started, and read
 * by `src/lib/accountRole.ts` to decide where an account lands. This panel
 * states that model rather than inventing a permissions matrix.
 *
 * **No account list.** There are no users to enumerate without a backend, and a
 * table of plausible staff names is exactly the fabrication a console invites.
 */
export function UsersAndRoles() {
  return (
    <>
      <Section title="Roles in this app">
        {ROLE_MODEL.map((r) => (
          <View key={r.backend} style={styles.row}>
            <View style={styles.rowHead}>
              <Text style={roleText.heading}>{r.product}</Text>
              <Text style={roleText.mono}>{r.backend}</Text>
            </View>
            <Text style={roleText.bodySoft}>{`Lands on: ${r.lands}`}</Text>
            <Text style={roleText.body}>{r.can}</Text>
          </View>
        ))}
        {/*
          On the screen, not only in a test: matching a role on the substring
          "admin" would put a corporate booker into this console.
        */}
        <Text style={[roleText.bodySoft, styles.note]}>
          A corporate booker is a CUSTOMER. Their role name contains “admin” and they do not dispatch —
          the mapping matches exact values, never substrings.
        </Text>
      </Section>

      <Section title="Managing accounts">
        <Empty
          what="No account management"
          needs="Creating, disabling and role-changing an account needs the auth project, which has never been confirmed to exist. Chauffeurs are added by the operator — there is no public sign-up — so this is where that would happen. See HANDOFF.md §7."
        />
      </Section>
    </>
  );
}

/** The four roles, their landing surface, and what each may reach. */
const ROLE_MODEL = [
  {
    backend: 'customer',
    product: 'Customer',
    lands: 'The customer app',
    can: 'Book, track, pay, view receipts and trip history.',
  },
  {
    backend: 'corporate_admin',
    product: 'Corporate booker',
    lands: 'The customer app',
    can: 'Everything a customer can, plus a company account and its travellers. Books FOR colleagues; does not dispatch.',
  },
  {
    backend: 'driver',
    product: 'Chauffeur',
    lands: 'The chauffeur board',
    can: "Today's jobs, job detail, and the stage controls. Sees no fares.",
  },
  {
    backend: 'admin',
    product: 'Operator',
    lands: 'This console',
    can: 'Reads everything here. Writes one thing: chauffeur assignment.',
  },
] as const;

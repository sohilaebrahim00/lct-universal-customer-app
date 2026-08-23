import { useEffect, useState } from 'react';
import { Animated, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Phone } from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { AppText } from '../ui/Typography';
import { StatusPill } from '../ui/StatusPill';
import { gutter, iconSize, iconStroke, radius, space, theme } from '../../theme';
import { useMotion } from '../../lib/useMotion';
import { TRIP_STATUS_LABELS, type TripStatus } from '../../lib/tripStatus';
import { arrivingLabel, tripProgress } from '../../lib/tripProgress';
import { servicePolicy } from '../../config/servicePolicy';
import {
  RIDE_STAGES,
  RIDE_STAGE_LABELS,
  customerHeadline,
  etaIsAttributable,
  rideStageIndex,
  stageFor,
  waitingSentence,
  waitingWindow,
  type RideStage,
} from '../../lib/rideStage';
import type { ServiceType, TripDriverInfo, TripVehicleInfo } from '../../types/api';

/**
 * The sheet that floats over the map.
 *
 * ── What it is allowed to contain ───────────────────────────────────────────
 * The arriving-in line, the progress bar, the chauffeur, the stage timeline,
 * and a way to reach a person. **Nothing is ever sold on this screen.** No
 * upgrade prompt, no rate-your-driver, no promo, no "add a stop for $10". A
 * customer watching a car approach is at their least able to evaluate an offer
 * and their most captive, and monetising that moment is the single clearest
 * line between this product and a ride-hailing app.
 *
 * ── The route to a human is visible, not buried ─────────────────────────────
 * One tap, always on screen, never behind a menu. A customer whose car has not
 * arrived does not want a help centre; they want dispatch. It renders only when
 * `servicePolicy.dispatchPhone` is set — a support number the business has not
 * published is not one this app invents.
 */

/**
 * THE CLIENT DOES NOT RENDER AN ETA IT CANNOT ATTRIBUTE.
 *
 * The socket carries a single `etaMinutes` with no statement of which leg it
 * measures — `BACKEND_FOLLOWUPS.md` G-5, "ETA is whatever the driver app last
 * said". Before pickup that number happens to coincide with the leg the
 * customer is watching. **That is luck, not correctness**: nothing in the
 * contract says it is the arrival ETA, and after pickup there is no basis at
 * all for claiming it means the destination.
 *
 * ── "In any form" is the part that needed a second pass ────────────────────
 * The first fix gated only the HEADLINE, and left the progress bar drawing from
 * the same number — rendering the unattributable ETA geometrically instead of
 * numerically, which is the same claim with the digits removed. One predicate
 * now gates both, so the next thing derived from `etaMinutes` cannot be added
 * without meeting it.
 *
 * The rule itself is `etaIsAttributable()` in `src/lib/rideStage.ts`, because
 * it is a property of the STAGE rather than of this component.
 */
export interface TrackingSheetProps {
  status: TripStatus;
  etaMinutes: number | null;
  /** The ETA when tracking began — the denominator the progress curve is drawn against. */
  totalMinutes: number | null;
  driver: TripDriverInfo | null;
  vehicle: TripVehicleInfo | null;
  /** Years with LCT. Null unless the backend supplies it — see BACKEND_FOLLOWUPS.md §2. */
  chauffeurYears: number | null;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  /** True while the socket is delivering updates. */
  live: boolean;
  /**
   * The trip detail could not be fetched — so there is no chauffeur, no ETA and
   * no position, and the customer is owed a reason rather than three blanks.
   */
  detailUnavailable?: boolean;
  onRetryDetail?: () => void;
  /**
   * When the chauffeur marked ARRIVED AT PICKUP, or null.
   *
   * Not a field on `Trip` — the backend has no such column (C-4). Supplied by
   * the demo layer's overlay and read through `arrivedAtFrom()`. Against a real
   * server it is always null and this sheet behaves exactly as it did before.
   */
  arrivedAt?: string | null;
  /** Decides the complimentary waiting window: 30 minutes, or 60 for airport. */
  serviceType?: ServiceType | null;
}

export function TrackingSheet({
  status,
  etaMinutes,
  totalMinutes,
  driver,
  vehicle,
  chauffeurYears,
  pickupAddress,
  dropoffAddress,
  live,
  detailUnavailable,
  onRetryDetail,
  arrivedAt = null,
  serviceType = null,
}: TrackingSheetProps) {
  const progress = tripProgress(etaMinutes, totalMinutes);
  const arriving = arrivingLabel(etaMinutes);
  const terminal = status === 'completed' || status === 'cancelled';
  const stage = stageFor(status, arrivedAt);

  /*
   * The countdown ticks once a second while the car is outside, and not
   * otherwise — an interval that runs on every screen for the whole trip is a
   * battery cost for a number nobody is looking at.
   */
  const [now, setNow] = useState(() => new Date());
  const counting = stage === 'arrived_at_pickup' && arrivedAt !== null;
  useEffect(() => {
    if (!counting) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [counting]);

  const waiting = counting && arrivedAt ? waitingWindow(arrivedAt, serviceType, now) : null;

  // One predicate, BOTH render sites — the headline and the progress bar. The
  // rule lives in rideStage.ts because it is a property of the stage, not of
  // this component.
  const showEta = etaIsAttributable(stage);

  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.headRow}>
          <StatusPill status={status} />
          {live ? (
            <AppText variant="captionSm" color={theme.content.tertiary}>
              Live
            </AppText>
          ) : null}
        </View>

        {/*
          The headline is the ETA when there is one, and the status when there
          is not. Never both competing, and never an empty slot where a number
          should be.
        */}
        {/*
          ARRIVAL OUTRANKS THE ETA.

          Once the car is at the kerb, "arriving in 4 min" is not merely stale,
          it is wrong — and it is wrong in the direction that keeps a customer
          sitting inside. So the arrived headline replaces the ETA rather than
          sitting beneath it.
        */}
        <AppText variant="title" style={styles.headline} accessibilityLiveRegion="polite">
          {stage && !showEta
            ? customerHeadline(stage)
            : terminal
              ? TRIP_STATUS_LABELS[status]
              : (arriving ?? TRIP_STATUS_LABELS[status])}
        </AppText>

        {/*
          THE COMPLIMENTARY WAITING WINDOW — a statement of policy, never a
          charge.

          It counts down from the moment the chauffeur marked arrival, using
          `servicePolicy`'s confirmed figures. It shows NO money: no fee, no
          rate, no running total. The fare was fixed at booking and nothing on
          the client prices anything — a ticking charge here would be the
          `From $65.00` defect wearing a clock.

          What happens after the window ends is a business question nobody has
          answered (PLATFORM_RECONCILIATION.md Q6), so the elapsed copy says the
          chauffeur is still waiting and stops there.
        */}
        {waiting ? (
          <View style={styles.waiting}>
            <AppText variant="figure" accessibilityLiveRegion="polite">
              {waiting.elapsed
                ? 'Complimentary wait ended'
                : `${waiting.minutesRemaining}:${String(waiting.secondsRemaining).padStart(2, '0')}`}
            </AppText>
            <AppText variant="caption">{waitingSentence(waiting)}</AppText>
          </View>
        ) : null}

        {progress !== null && !terminal && showEta ? <ProgressBar value={progress} /> : null}

        {/*
          Says WHICH part is missing, and offers the retry. Without this the
          screen renders a status pill over a blank map and lets the customer
          conclude whatever they like — most likely that the car is not coming.
        */}
        {detailUnavailable ? (
          <Pressable
            onPress={onRetryDetail}
            accessibilityRole="button"
            accessibilityLabel="Chauffeur details unavailable. Tap to retry."
            style={({ pressed }) => [styles.detailError, pressed ? styles.pressed : null]}
          >
            <AppText variant="caption" color={theme.content.warning}>
              We couldn&apos;t load your chauffeur and ETA. Your booking is unaffected.
            </AppText>
            <AppText variant="captionSm" color={theme.content.accentSoft}>
              Tap to retry
            </AppText>
          </Pressable>
        ) : null}

        {driver ? (
          <View style={styles.chauffeurRow}>
            <Avatar name={driver.full_name} uri={driver.avatar_url} size="md" />
            <View style={styles.chauffeurText}>
              <AppText variant="subheading" numberOfLines={1}>
                {driver.full_name}
              </AppText>
              {/*
                TENURE, NOT A RATING.

                Rating a chauffeur implies the customer might be sent a bad one,
                which is precisely the anxiety a chauffeur service exists to
                remove — Blacklane and Wheely show neither. Tenure says the
                opposite thing: this person has done this for years.

                `drivers.hired_at` DOES NOT EXIST (BACKEND_FOLLOWUPS.md §2), so
                `chauffeurYears` is null in every build today and this line
                renders nothing. It does NOT fall back to `driver.rating`, which
                is populated and available — falling back would quietly restore
                the exact thing the design removed.
              */}
              {chauffeurYears !== null ? (
                <AppText variant="captionSm">
                  {`${chauffeurYears} ${chauffeurYears === 1 ? 'year' : 'years'} with LCT`}
                </AppText>
              ) : null}
              {vehicle ? (
                <AppText variant="captionSm" numberOfLines={1}>
                  {vehicle.name}
                </AppText>
              ) : null}
            </View>
          </View>
        ) : null}

        <Timeline status={status} arrivedAt={arrivedAt} />

        <View style={styles.route}>
          {pickupAddress ? <RouteLine label="Pickup" value={pickupAddress} /> : null}
          {dropoffAddress ? <RouteLine label="Destination" value={dropoffAddress} /> : null}
        </View>
      </ScrollView>

      {servicePolicy.dispatchPhone ? (
        <Pressable
          onPress={() => void Linking.openURL(`tel:${servicePolicy.dispatchPhone!.replace(/[^\d+]/g, '')}`)}
          accessibilityRole="button"
          accessibilityLabel="Call dispatch"
          style={({ pressed }) => [styles.dispatch, pressed ? styles.pressed : null]}
        >
          <Phone size={iconSize.md} color={theme.content.accentSoft} strokeWidth={iconStroke.interactive} />
          <AppText variant="caption" color={theme.content.accentSoft} style={styles.dispatchLabel}>
            Call dispatch
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * The bar animates to its new value rather than stepping.
 *
 * The value it is fed already moves non-linearly (see `tripProgress`); a step
 * on top of that would read as a glitch. Under reduced motion it sets the width
 * directly — the bar carries information, so it must still be correct, it just
 * stops travelling.
 */
function ProgressBar({ value }: { value: number }) {
  const motion = useMotion();
  /*
   * Lazy `useState`, not `useRef(...).current`. The animated value has to be
   * READ during render — it is the style — and reading a ref during render is
   * exactly what the react-hooks rule forbids. `useState` with an initialiser
   * creates it once and hands back a stable value that render may legitimately
   * use.
   */
  const [width] = useState(() => new Animated.Value(value));

  useEffect(() => {
    if (motion.reduced) {
      width.setValue(value);
      return;
    }
    Animated.timing(width, { toValue: value, duration: 600, useNativeDriver: false }).start();
  }, [value, motion.reduced, width]);

  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    >
      <Animated.View
        style={[
          styles.fill,
          { width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
    </View>
  );
}

/**
 * The stage timeline, which announces itself as it advances.
 *
 * `accessibilityLiveRegion="polite"` on the CURRENT stage only. Marking the
 * whole list live would make a screen reader re-read seven rows on every
 * status change; marking the active row means the one thing that changed is
 * the one thing announced — "Chauffeur Arriving" — without interrupting
 * whatever the user was reading.
 */
function Timeline({ status, arrivedAt }: { status: TripStatus; arrivedAt: string | null }) {
  const motion = useMotion();
  const current = stageFor(status, arrivedAt);

  if (status === 'cancelled' || current === null) {
    return (
      <AppText variant="caption" style={styles.cancelled}>
        This trip was cancelled.
      </AppText>
    );
  }

  const reached = rideStageIndex(current);

  return (
    <View style={styles.timeline}>
      {RIDE_STAGES.map((stage: RideStage) => {
        const index = rideStageIndex(stage);
        const done = index < reached;
        const active = index === reached;
        return (
          <View key={stage} style={styles.stageRow}>
            <StageDot done={done} active={active} reduced={motion.reduced} />
            <AppText
              variant={active ? 'subheading' : 'caption'}
              color={done || active ? theme.content.primary : theme.content.tertiary}
              accessibilityLiveRegion={active ? 'polite' : 'none'}
            >
              {RIDE_STAGE_LABELS[stage]}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

/** The active dot breathes once when it becomes active, then rests. */
function StageDot({ done, active, reduced }: { done: boolean; active: boolean; reduced: boolean }) {
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!active || reduced) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.6, duration: 220, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
    // Once, not a loop. A repeating pulse turns a state into an idle animation.
  }, [active, reduced, scale]);

  return (
    <Animated.View
      style={[
        styles.dot,
        done || active ? styles.dotOn : null,
        active ? { transform: [{ scale }] } : null,
      ]}
    />
  );
}

function RouteLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.routeLine}>
      <AppText variant="micro">{label}</AppText>
      <AppText variant="caption" numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: theme.background.tertiary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderTopColor: theme.border.hairlineStrong,
    maxHeight: '62%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: theme.border.hairlineStrong,
    marginTop: space.sm,
  },
  body: { padding: gutter, paddingTop: space.smd },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headline: { marginTop: space.sm },
  track: {
    height: 4,
    borderRadius: radius.full,
    backgroundColor: theme.background.inset,
    overflow: 'hidden',
    marginTop: space.md,
  },
  fill: { height: 4, borderRadius: radius.full, backgroundColor: theme.content.accent },
  detailError: {
    marginTop: space.md,
    padding: space.smd,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border.hairlineStrong,
    gap: 2,
    minHeight: 44,
    justifyContent: 'center',
  },
  chauffeurRow: { flexDirection: 'row', alignItems: 'center', gap: space.smd, marginTop: space.lg },
  chauffeurText: { flex: 1 },
  timeline: { marginTop: space.lg, gap: space.sm },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: space.smd },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: theme.content.tertiary,
  },
  dotOn: { backgroundColor: theme.content.accent, borderColor: theme.content.accent },
  waiting: { marginTop: space.smd, marginBottom: space.sm, gap: space.xs },
  cancelled: { marginTop: space.md },
  route: { marginTop: space.lg, gap: space.smd },
  routeLine: { gap: 2 },
  dispatch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: theme.border.hairline,
  },
  dispatchLabel: {},
  pressed: { backgroundColor: theme.background.pressedOverlay },
});

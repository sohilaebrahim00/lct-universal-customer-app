import { useEffect, useState } from 'react';
import { Animated, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Phone } from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { AppText } from '../ui/Typography';
import { StatusPill } from '../ui/StatusPill';
import { gutter, iconSize, iconStroke, radius, space, theme } from '../../theme';
import { useMotion } from '../../lib/useMotion';
import { TRIP_STAGE_ORDER, TRIP_STATUS_LABELS, stageIndex, type TripStatus } from '../../lib/tripStatus';
import { arrivingLabel, tripProgress } from '../../lib/tripProgress';
import { servicePolicy } from '../../config/servicePolicy';
import type { TripDriverInfo, TripVehicleInfo } from '../../types/api';

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
}: TrackingSheetProps) {
  const progress = tripProgress(etaMinutes, totalMinutes);
  const arriving = arrivingLabel(etaMinutes);
  const terminal = status === 'completed' || status === 'cancelled';

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
        <AppText variant="title" style={styles.headline} accessibilityLiveRegion="polite">
          {terminal ? TRIP_STATUS_LABELS[status] : (arriving ?? TRIP_STATUS_LABELS[status])}
        </AppText>

        {progress !== null && !terminal ? <ProgressBar value={progress} /> : null}

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

        <Timeline status={status} />

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
function Timeline({ status }: { status: TripStatus }) {
  const motion = useMotion();
  const reached = stageIndex(status);

  if (status === 'cancelled') {
    return (
      <AppText variant="caption" style={styles.cancelled}>
        This trip was cancelled.
      </AppText>
    );
  }

  return (
    <View style={styles.timeline}>
      {TRIP_STAGE_ORDER.filter((s) => s !== 'pending').map((stage) => {
        const index = stageIndex(stage);
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
              {TRIP_STATUS_LABELS[stage]}
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

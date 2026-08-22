import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticSuccess } from '../../../src/lib/haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Calendar, Check, Share2 } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { Surface } from '../../../src/components/ui/Surface';
import { AppText } from '../../../src/components/ui/Typography';
import { choreography, gutter, iconSize, iconStroke, radius, space, theme } from '../../../src/theme';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { bookingsApi } from '../../../src/api/bookings';
import type { Booking } from '../../../src/types/api';
import { formatCurrency, formatDateTime } from '../../../src/lib/format';
import { useMotion } from '../../../src/lib/useMotion';
import { cancellationSentenceFor } from '../../../src/config/servicePolicy';

/**
 * CONFIRMED — the emotional peak, and previously the least designed screen in
 * the app: 34 lines, a static 72pt check, two lines of copy, one button.
 *
 * ── The seal ────────────────────────────────────────────────────────────────
 * Two rings expand from scale .6 / opacity .55 to scale 1.9 / opacity 0 over
 * 2.6s, the second delayed 0.9s. ONCE — not a loop. A repeating pulse turns a
 * moment into an idle animation, and this is the one place in the app that
 * should feel like an event rather than a state.
 *
 * Under reduced motion the rings do not run at all. This is decorative motion
 * with no information in it, so removal is the correct degradation — unlike a
 * transition, where the substitute is a cross-fade.
 */

const RING_SIZE = 74;

export default function ConfirmedStep() {
  const router = useRouter();
  const { bookingId, tripId } = useLocalSearchParams<{ bookingId?: string; tripId?: string }>();
  const draft = useBookingFormStore((s) => s.draft);
  const resetDraft = useBookingFormStore((s) => s.reset);
  const motion = useMotion();

  const ringA = useSharedValue(0);
  const ringB = useSharedValue(0);

  useEffect(() => {
    if (motion.reduced) return;
    const config = { duration: choreography.sealRing, easing: Easing.out(Easing.cubic) };
    ringA.value = withTiming(1, config);
    ringB.value = withDelay(choreography.sealRingDelay, withTiming(1, config));
    // The one success haptic in the whole app. Native-only — see src/lib/haptics.ts.
    hapticSuccess();
  }, [motion.reduced, ringA, ringB]);

  const ringAStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - ringA.value),
    transform: [{ scale: 0.6 + ringA.value * 1.3 }],
  }));
  const ringBStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - ringB.value),
    transform: [{ scale: 0.6 + ringB.value * 1.3 }],
  }));

  /**
   * Derived from the booking id, not generated — the same booking always shows
   * the same code, and nothing here is a typed-in string.
   */
  const reservationCode = useMemo(() => {
    const source = (bookingId ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return source ? `LCT-${source.slice(-6).padStart(6, '0')}` : null;
  }, [bookingId]);

  /**
   * THE TOTAL ON A RECEIPT IS THE SERVER'S, ALWAYS.
   *
   * This read `draft.allInFare` — the client's preview — and printed it as the
   * reservation total. So even after the payment screen was fixed to compare
   * against and charge the server's figure, the confirmation screen went back
   * to showing the client's. The same defect, one screen downstream, and the
   * more damaging one: this screen is the receipt, and it is what the customer
   * screenshots.
   *
   * It now fetches the booking. Fetching rather than passing the number through
   * the route is deliberate — this screen is reachable by deep link and survives
   * a reload, and in both cases a param would be gone while the booking is not.
   * Until the fetch lands the total renders nothing rather than a preview, on
   * the same rule as everywhere else: no figure beats a figure that might be
   * wrong.
   */
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let active = true;
    bookingsApi
      .get(bookingId)
      .then((b) => {
        if (active) setBooking(b);
      })
      .catch(() => {
        // The booking exists — the customer has just made it — so a failure
        // here is a transient read. The total stays blank rather than falling
        // back to the preview, which is the number this fix exists to stop
        // showing.
        if (active) setBooking(null);
      });
    return () => {
      active = false;
    };
  }, [bookingId]);

  const serverTotal = booking ? formatCurrency(booking.total_fare, booking.currency) : null;
  const scheduled = draft.scheduledAt ? formatDateTime(draft.scheduledAt.toISOString()) : null;
  const route = [draft.pickupAddress, draft.dropoffAddress].filter(Boolean).join(' → ');

  function goToTrip() {
    resetDraft();
    if (tripId) router.replace(`/(app)/trips/${bookingId ?? tripId}`);
    else router.replace('/(app)/trips');
  }

  async function shareTrip() {
    const parts = ['My LCT Universal car is reserved.', scheduled, route, reservationCode].filter(Boolean);
    try {
      await Share.share({ message: parts.join('\n') });
    } catch {
      // The user dismissed the sheet, or the platform declined. Not an error.
    }
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['rgba(217,177,96,0.16)', 'rgba(217,177,96,0)']}
        style={styles.glow}
        pointerEvents="none"
      />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.sealWrap}>
          {motion.reduced ? null : (
            <>
              <Animated.View style={[styles.ring, ringAStyle]} pointerEvents="none" />
              <Animated.View style={[styles.ring, ringBStyle]} pointerEvents="none" />
            </>
          )}
          <LinearGradient colors={theme.accent.gradientSeal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.seal}>
            <Check size={32} color={theme.content.onAccent} strokeWidth={1.8} />
          </LinearGradient>
        </View>

        <AppText variant="display" center accessibilityRole="header" style={styles.headline}>
          Your car is reserved
        </AppText>
        <AppText variant="bodyLead" center style={styles.expectation}>
          We&apos;ll assign your chauffeur ahead of pickup and notify you the moment we do.
        </AppText>

        <Surface level="cardProminent" cornerRadius={radius.lg} style={styles.reservation}>
          <View style={styles.reservationTop}>
            <View style={styles.codeRow}>
              <AppText variant="micro">Reservation</AppText>
              {reservationCode ? (
                <AppText variant="captionSm" color={theme.content.accentSoft}>
                  {reservationCode}
                </AppText>
              ) : null}
            </View>
            {scheduled ? (
              <AppText variant="heading" style={styles.when}>
                {scheduled}
              </AppText>
            ) : null}
            {route ? (
              <AppText variant="caption" numberOfLines={2}>
                {route}
              </AppText>
            ) : null}
          </View>

          {/* The perforated ticket edge. */}
          <View style={styles.perforation} />

          <View style={styles.reservationFoot}>
            <View style={styles.footCell}>
              <AppText variant="micro">Car</AppText>
              <AppText variant="subheading" numberOfLines={1}>
                {draft.vehicle?.name ?? '—'}
              </AppText>
            </View>
            <View style={styles.footDivider} />
            <View style={styles.footCell}>
              <AppText variant="micro">Total</AppText>
              <AppText variant="subheading">{serverTotal ?? ''}</AppText>
            </View>
          </View>
        </Surface>

        {/* Published policy, resolved for the service that was actually booked. */}
        {cancellationSentenceFor(draft.serviceType) ? (
          <AppText variant="captionSm" center style={styles.policy}>
            {cancellationSentenceFor(draft.serviceType)}
          </AppText>
        ) : null}

        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add to calendar"
            onPress={() => {
              // Calendar write needs expo-calendar and a permission prompt —
              // neither is installed, and adding a dependency is not in scope.
              // The control is present and inert rather than absent, so the
              // shape of the screen is right when it is wired.
            }}
            style={styles.secondaryAction}
          >
            <Calendar size={iconSize.sm} color={theme.content.accentSoft} strokeWidth={iconStroke.interactive} />
            <AppText variant="caption" color={theme.content.accentSoft} style={styles.secondaryLabel}>
              Add to calendar
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share trip"
            onPress={() => void shareTrip()}
            style={styles.shareAction}
          >
            <Share2 size={iconSize.sm} color={theme.content.accentSoft} strokeWidth={iconStroke.interactive} />
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="View trip" haptic onPress={goToTrip} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to home"
          onPress={() => {
            resetDraft();
            router.replace('/(app)');
          }}
          style={styles.backHome}
        >
          <AppText variant="caption">Back to home</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background.primary },
  glow: { position: 'absolute', top: -60, left: -60, right: -60, height: 420 },
  body: { paddingHorizontal: gutter, paddingTop: space.xxl, paddingBottom: space.mdl, alignItems: 'stretch' },

  sealWrap: { alignSelf: 'center', width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: theme.content.accent,
  },
  seal: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: { marginBottom: space.smd },
  expectation: { marginBottom: 26, paddingHorizontal: 14 },

  reservation: { marginBottom: space.mdl },
  reservationTop: { padding: space.md },
  codeRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space.smd },
  when: { marginBottom: space.xs },
  perforation: { borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: theme.border.hairlineStrong },
  reservationFoot: { flexDirection: 'row' },
  footCell: { flex: 1, paddingVertical: 13, paddingHorizontal: space.md },
  footDivider: { width: StyleSheet.hairlineWidth, backgroundColor: theme.border.hairline },

  policy: { marginBottom: space.smd },
  actionsRow: { flexDirection: 'row', gap: 9 },
  secondaryAction: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border.outline,
  },
  secondaryLabel: { marginStart: space.sm },
  shareAction: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border.outline,
  },

  footer: { paddingHorizontal: gutter, paddingBottom: space.mdl, paddingTop: space.sm },
  backHome: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: space.sm },
});

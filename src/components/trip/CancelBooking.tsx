import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../ui/Typography';
import { Button } from '../ui/Button';
import { radius, space, theme } from '../../theme';
import { freeCancellationHoursFor, servicePolicy } from '../../config/servicePolicy';
import type { ServiceType } from '../../types/api';

/**
 * CANCELLING A RIDE — the control the app promised and did not have.
 *
 * `book/payment.tsx` and `book/confirmed.tsx` both tell a customer, on the two
 * screens where money is committed, that they may cancel free up to a stated
 * number of hours before pickup. `bookingsApi.cancel()` exists, the endpoint
 * exists, and **no screen called either**. The Cancelled tab advertised itself
 * as a place rides would appear that nothing could put there.
 *
 * ── The confirmation states the real window, never "are you sure" ──────────
 * The window is resolved per service type from `servicePolicy` — 6 hours on an
 * airport transfer, 12 on a point-to-point, 48 on hourly and events. Showing a
 * generic confirmation on a screen whose own policy line said "6 hours" would
 * be the app forgetting what it had just told the customer.
 *
 * ── No fee figure. Ever. ──────────────────────────────────────────────────
 * Inside the window: cancelling is free and it says so. Outside it: it says the
 * free window has passed and routes to dispatch. It does **not** say what will
 * be charged.
 *
 * `lctuniversal.com/cancellation-policy` publishes tiers — 50% inside the
 * window, full charge inside two hours or on a no-show — and they are recorded
 * in `servicePolicy.ts` as `CANCELLATION_FEE_TIERS_PUBLISHED`. They are
 * deliberately not rendered here: whether the app may assert a charge, and who
 * may waive it, is unanswered (`OPEN_QUESTIONS.md` 14c). Printing a figure
 * above a confirm button is a commitment, and this one has not been made.
 */

export interface CancelConfirmProps {
  serviceType: ServiceType | null;
  scheduledAt: string;
  cancelling: boolean;
  onConfirm: () => void;
  /** "Keep it" — dismisses without cancelling. */
  onDismiss: () => void;
}

export type CancelBookingProps = Omit<CancelConfirmProps, 'onDismiss'>;

/** Hours until pickup, or null when the date will not parse. */
function hoursUntil(scheduledAt: string, now: Date): number | null {
  const at = new Date(scheduledAt).getTime();
  if (!Number.isFinite(at)) return null;
  return (at - now.getTime()) / 3_600_000;
}

/**
 * The confirmation on its own — no trigger, no local state.
 *
 * Exported because two screens raise it from different places: the tracking
 * sheet inline, and the trips list from a row, in a modal. Both must say the
 * SAME thing, and the way to guarantee that is one component rather than two
 * that agree today.
 */
export function CancelConfirm({ serviceType, scheduledAt, cancelling, onConfirm, onDismiss }: CancelConfirmProps) {
  const windowHours = freeCancellationHoursFor(serviceType);
  const remaining = hoursUntil(scheduledAt, new Date());

  /*
   * Unknown counts as INSIDE the window. If the policy has no figure for this
   * service, or the date will not parse, the app must not tell a customer they
   * have missed a deadline it cannot compute.
   */
  const insideWindow = windowHours === null || remaining === null || remaining >= windowHours;

  return (
    <View style={styles.panel}>
      <AppText variant="subheading">Cancel this ride?</AppText>

      {insideWindow ? (
        <AppText variant="caption" style={styles.line}>
          {windowHours === null
            ? 'Your booking will be cancelled.'
            : `You are within the free cancellation window — up to ${windowHours} ${windowHours === 1 ? 'hour' : 'hours'} before pickup. There is no charge.`}
        </AppText>
      ) : (
        <>
          {/*
            Outside the window. Says so, and stops — no figure, because the app
            has not been told it may assert one. Dispatch can.
          */}
          <AppText variant="caption" style={styles.line}>
            {`The free cancellation window — ${windowHours} ${windowHours === 1 ? 'hour' : 'hours'} before pickup — has passed. Please call dispatch so we can help.`}
          </AppText>
          {servicePolicy.dispatchPhone ? (
            <AppText variant="caption" color={theme.content.accent}>
              {servicePolicy.dispatchPhone}
            </AppText>
          ) : null}
        </>
      )}

      <View style={styles.actions}>
        <Button
          label={cancelling ? 'Cancelling…' : 'Cancel the ride'}
          variant="ghost"
          onPress={onConfirm}
          disabled={cancelling}
        />
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Keep this ride"
          style={({ pressed }) => [styles.keep, pressed ? styles.pressed : null]}
        >
          <AppText variant="caption">Keep it</AppText>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * The trigger and the confirmation together, for a screen that has room to
 * expand in place — the tracking sheet. The list uses `CancelConfirm` in a
 * modal instead, because a row cannot grow.
 */
export function CancelBooking(props: CancelBookingProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) return <CancelConfirm {...props} onDismiss={() => setConfirming(false)} />;

  return (
    <Pressable
      onPress={() => setConfirming(true)}
      accessibilityRole="button"
      accessibilityLabel="Cancel this ride"
      style={({ pressed }) => [styles.link, pressed ? styles.pressed : null]}
    >
      <AppText variant="caption" color={theme.content.secondary}>
        Cancel this ride
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /* 44 high: this sits in a scroll view of tappable rows. */
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: space.md },
  pressed: { opacity: 0.7 },
  panel: {
    marginTop: space.md,
    padding: space.mdl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.border.hairline,
    gap: space.xs,
  },
  line: { marginTop: space.xs },
  actions: { marginTop: space.sm, gap: space.xs },
  keep: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});

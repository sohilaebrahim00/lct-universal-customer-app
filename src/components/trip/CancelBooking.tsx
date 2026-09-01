import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../ui/Typography';
import { Button } from '../ui/Button';
import { radius, space, theme } from '../../theme';
import {
  CANCELLATION_FEE_TIERS_PUBLISHED,
  cancellationTiersFor,
  freeCancellationHoursFor,
  servicePolicy,
} from '../../config/servicePolicy';
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
 * ── What it says about money, and a position that was changed ─────────────
 * Inside the window: cancelling is free and it says so. Outside it: the window
 * has passed, **and the tiers the business publishes for that service are
 * stated**, cited to the policy page.
 *
 * The first version of this component withheld those tiers, on the reasoning
 * that "putting a charge on a screen is a commitment nobody has made". That
 * reasoning does not survive the file it came from. The tiers are the CLIENT's
 * own figures, from their own public policy page, read and dated in
 * `servicePolicy.ts` exactly like the free windows — and this app has printed
 * "free until 12 hours before pickup" from the same paragraph for weeks. There
 * is no principle that admits one sentence and refuses the next three.
 *
 * Withholding them did not make the app cautious. It made it know less than the
 * website a customer could open in the next tab, at the one moment the number
 * mattered to them.
 *
 * ── What is still withheld, and why that one is different ─────────────────
 * The WAIVER. `lctuniversal.com` says fees "may be waived at the company's
 * discretion" in severe weather or a verified emergency. A discretion rendered
 * beside a confirm button reads as an entitlement, and who may exercise it is
 * genuinely unanswered — `OPEN_QUESTIONS.md` 14c, an operator question rather
 * than a customer screen. So the tiers are stated and the waiver is not.
 *
 * No figure here is computed, scaled, or applied to this booking's fare. The
 * app states policy; it does not tell a customer what they owe.
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
  const tiers = cancellationTiersFor(serviceType);
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
            Outside the window. Says so, then states what the BUSINESS
            publishes for this service — not a figure the app invented, and not
            a figure it withheld. See `cancellationTiersFor`.
          */}
          <AppText variant="caption" style={styles.line}>
            {`The free cancellation window — ${windowHours} ${windowHours === 1 ? 'hour' : 'hours'} before pickup — has passed.`}
          </AppText>

          {tiers ? (
            <View style={styles.tiers}>
              {tiers.map((tier) => (
                <AppText key={tier} variant="caption" color={theme.content.secondary}>
                  {`· ${tier}`}
                </AppText>
              ))}
              {/*
                Cited, like every other published figure in this app. A customer
                who wants to check it is told exactly where it came from.
              */}
              <AppText variant="captionSm" color={theme.content.tertiary} style={styles.source}>
                {`LCT's published cancellation policy (${CANCELLATION_FEE_TIERS_PUBLISHED.source}).`}
              </AppText>
            </View>
          ) : null}

          <AppText variant="caption" style={styles.line}>
            Call dispatch if anything about this ride has changed.
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
  tiers: { marginTop: space.xs, gap: 2 },
  source: { marginTop: space.xs },
  actions: { marginTop: space.sm, gap: space.xs },
  keep: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});

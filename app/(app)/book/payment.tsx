import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check, ChevronLeft, ChevronRight, CreditCard, Plus } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { IconButton } from '../../../src/components/ui/IconButton';
import { ListRow } from '../../../src/components/ui/ListRow';
import { PriceBreakdown, type FareLine } from '../../../src/components/ui/PriceBreakdown';
import { ProgressRail } from '../../../src/components/ui/ProgressRail';
import { AppText } from '../../../src/components/ui/Typography';
import { gutter, iconSize, iconStroke, radius, space, theme } from '../../../src/theme';
import { useBookingFormStore } from '../../../src/store/bookingFormStore';
import { calculateFarePreview, type FareBreakdown } from '../../../src/lib/pricingPreview';
import { fareDiffers, serverFareFrom, type ServerFare } from '../../../src/lib/serverFare';
import { formatCurrency, formatDateTime, formatEstimatedArrival, formatServiceType } from '../../../src/lib/format';
import { isStripeConfigured } from '../../../src/lib/env';
import { useStripeCheckout } from '../../../src/lib/useStripeCheckout';
import { AuthGate } from '../../../src/components/AuthGate';
import { cancellationSentenceFor, complimentaryWaitSentenceFor } from '../../../src/config/servicePolicy';
import { isRTL } from '../../../src/i18n/rtl';

/**
 * STEP 5 — REVIEW & PAY.
 *
 * ── Nothing here is a surprise, which is the entire point ───────────────────
 * The breakdown is expanded by DEFAULT, not behind a disclosure triangle. Fare
 * opacity is the most-complained-about failure in this product category, and
 * the answer is showing every line before the customer authorises it.
 *
 * ── The two numbers, and which one is real ──────────────────────────────────
 * BEFORE the customer authorises, the total is `draft.allInFare` — the exact
 * object the vehicle screen computed and the customer chose the car on,
 * carried, never re-derived. It is a PREVIEW, and it is labelled as one by
 * the absence of the reassurance line.
 *
 * AFTER `POST /bookings` returns, the total is the SERVER's, read straight off
 * the created booking. That is the number Stripe charges — `/payments/intent`
 * sends `amount: Number(booking.total_fare)` — so it is the only number that
 * was ever authoritative. The two are compared before anything reaches Stripe,
 * and a difference of one cent stops the flow. See `handlePayAndConfirm` and
 * `src/lib/serverFare.ts`.
 *
 * This is the fix for a defect that survived the whole redesign: the screen
 * had never once read the server's figure, and the guard that looked like it
 * was checking for exactly this was comparing the client's preview against the
 * client's own recomputation.
 *
 * ── The policy lines ────────────────────────────────────────────────────────
 * Two of them now, both resolved per service type: the free-cancellation window
 * and the complimentary wait. This comment used to say they rendered nothing
 * because the figures were blocked business inputs — they are answered, and
 * they render.
 *
 * The rule that produced that blank is unchanged and still the right one: a
 * promise printed above a pay button is a commitment, so it appears only when
 * the business has actually made it. What changed is that they have.
 *
 * The wait line belongs beside a price because it IS part of the price — it is
 * the span in which waiting costs nothing. Note that the app can STATE it and
 * cannot BILL against it; see `servicePolicy` and BACKEND_FOLLOWUPS.md C-4.
 */
export default function PaymentStep() {
  const router = useRouter();
  const draft = useBookingFormStore((s) => s.draft);
  const submit = useBookingFormStore((s) => s.submit);
  const submitting = useBookingFormStore((s) => s.submitting);
  const storeError = useBookingFormStore((s) => s.error);
  const { payWithStripe } = useStripeCheckout();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** The figure the customer chose on, carried forward — not re-derived. */
  const carried = draft.allInFare;

  // Presented, not computed here — see formatEstimatedArrival().
  const arrivesApprox = formatEstimatedArrival(draft.scheduledAt, draft.durationMinutes);

  /**
   * A last-resort preview, for a draft that somehow arrives with no carried
   * fare. Only ever a preview — the reassurance line stays off until the
   * server has confirmed a figure, so nothing here can claim to be the price.
   */
  const fallback = useMemo<FareBreakdown | null>(() => {
    if (carried || !draft.vehicle || !draft.serviceType) return null;
    try {
      return calculateFarePreview({
        vehicle: {
          baseRate: Number(draft.vehicle.base_rate),
          perMileRate: Number(draft.vehicle.per_mile_rate),
          perHourRate: draft.vehicle.per_hour_rate === null ? null : Number(draft.vehicle.per_hour_rate),
        },
        serviceType: draft.serviceType,
        distanceMiles: draft.distanceMiles,
        hourlyDurationHours: draft.hourlyDurationHours,
        scheduledAt: draft.scheduledAt ?? new Date(),
      });
    } catch {
      return null;
    }
  }, [carried, draft]);

  /**
   * The server's fare, once `POST /bookings` has returned one.
   *
   * Null until the customer authorises. From the moment it is set it REPLACES
   * the preview everywhere on this screen — it is the number Stripe will
   * charge, and the preview never was.
   */
  const [serverFare, setServerFare] = useState<ServerFare | null>(null);
  /** The created booking, held so a second authorisation does not create another. */
  const [created, setCreated] = useState<{ bookingId: string; tripId: string } | null>(null);
  /** True when the server disagreed with the number the customer chose the car on. */
  const [priceChanged, setPriceChanged] = useState(false);

  /*
   * The preview-against-preview guard is GONE.
   *
   * It recomputed `calculateFarePreview()` here and compared the result to the
   * carried object — two runs of the same function, on the same inputs, in the
   * same process. It could only ever agree, and its own comment admitted as
   * much once the route reorder landed. Worse, it read as a fare-change guard
   * while never once seeing the server's figure, which is the only number that
   * can actually differ. Replaced by the comparison in `handlePayAndConfirm`.
   *
   * The preview still renders here BEFORE authorisation, because until a
   * booking exists there is no server figure to show. It is the same object the
   * customer chose the car on, carried, never re-derived.
   */
  const preview = carried ?? fallback;

  const previewLines = useMemo<FareLine[]>(() => {
    if (!preview) return [];
    const rows: FareLine[] = [{ label: 'Base fare', amount: preview.baseFare }];
    if (preview.distanceFare > 0) {
      rows.push({
        label: draft.distanceMiles ? `Distance · ${draft.distanceMiles} mi` : 'Distance',
        amount: preview.distanceFare,
      });
    }
    if (preview.timeFare > 0) rows.push({ label: 'Time', amount: preview.timeFare });
    if (preview.surcharges > 0) rows.push({ label: 'Late-night surcharge', amount: preview.surcharges });
    rows.push({ label: 'Gratuity · 20%', amount: preview.gratuity });
    rows.push({ label: 'Tax', amount: preview.tax });
    return rows;
  }, [preview, draft.distanceMiles]);

  /** What is on screen: the server's breakdown once it exists, the preview until then. */
  const shownLines = serverFare ? serverFare.lines : previewLines;
  const shownTotal = serverFare ? serverFare.total : (preview?.totalFare ?? null);
  const currency = serverFare?.currency ?? 'usd';

  /**
   * Takes the created booking to Stripe and on to the confirmation screen.
   *
   * Split out so a customer who has just been shown a changed price can
   * authorise the NEW figure without a second booking being created.
   */
  async function proceedToPayment(bookingId: string, tripId: string) {
    if (isStripeConfigured) {
      setProcessing(true);
      const checkout = await payWithStripe(bookingId);
      setProcessing(false);
      if (checkout.status === 'error') {
        setError(checkout.message ?? 'Payment failed');
        return;
      }
      if (checkout.status === 'cancelled') return;
    }

    router.replace(`/(app)/book/confirmed?bookingId=${bookingId}&tripId=${tripId}`);
  }

  /**
   * THE GUARD THAT MATTERS.
   *
   * `POST /bookings` prices the booking server-side and ignores anything the
   * client sends about money. `POST /payments/intent` then charges
   * `Number(booking.total_fare)`. So between authorising and being charged,
   * there is exactly one moment where the two numbers can be compared — here,
   * after creation and before Stripe — and until now nothing did.
   *
   * If they differ by a single cent the flow STOPS. The customer sees the
   * server's breakdown, the old total, the new one, and authorises again or
   * goes back. Never a silent substitution, in either direction: being charged
   * less than the breakdown showed is the same broken promise pointed the other
   * way, and it is the one that reaches the business rather than the customer.
   */
  async function handlePayAndConfirm() {
    setError(null);

    // Already created and re-authorised at the server's price — do not create
    // a second booking.
    if (created) {
      await proceedToPayment(created.bookingId, created.tripId);
      return;
    }

    const result = await submit();
    if (!result) return;

    const authorised = preview?.totalFare ?? null;
    const server = serverFareFrom(result.booking);

    setServerFare(server);
    setCreated({ bookingId: result.bookingId, tripId: result.tripId });

    if (authorised !== null && fareDiffers(authorised, server.total)) {
      setPriceChanged(true);
      return; // Stops here. Nothing reaches Stripe on a number the customer has not seen.
    }

    await proceedToPayment(result.bookingId, result.tripId);
  }

  const total = shownTotal !== null ? formatCurrency(shownTotal, currency) : null;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconButton
          icon={isRTL() ? ChevronRight : ChevronLeft}
          accessibilityLabel="Go back"
          variant="circular"
          onPress={() => router.back()}
        />
        <View style={styles.railWrap}>
          <ProgressRail step={5} total={5} label="Review & pay" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card style={styles.card} flush>
          <ListRow title="Service" value={draft.serviceType ? formatServiceType(draft.serviceType) : '—'} chevron={false} />
          <ListRow title="Pickup" value={draft.pickupAddress || '—'} chevron={false} />
          {draft.serviceType !== 'hourly' ? (
            <ListRow title="Drop-off" value={draft.dropoffAddress || '—'} chevron={false} />
          ) : null}
          <ListRow
            title="Date & time"
            value={draft.scheduledAt ? formatDateTime(draft.scheduledAt.toISOString()) : 'Confirmed on booking'}
            chevron={false}
          />
          {/*
            THE QUESTION AN AIRPORT PASSENGER ACTUALLY ASKS.

            The routing duration was already computed to price the journey; this
            presents a number the app has rather than fetching a new one. It is
            an ESTIMATE and the label says so — the source is a live-traffic
            figure for the moment the route was fetched, not a promise about a
            drive that has not started.

            Absent entirely when there is no duration — an hourly booking has no
            drop-off, and a manual-entry fallback with no Maps key has no route.
            No figure, no row.
          */}
          {arrivesApprox ? (
            <ListRow title="Arrives approx." value={arrivesApprox} chevron={false} />
          ) : null}
          <ListRow title="Car" value={draft.vehicle?.name ?? '—'} chevron={false} divider={false} />
        </Card>

        {shownTotal !== null ? (
          <Card style={styles.card}>
            <PriceBreakdown
              lines={shownLines}
              total={shownTotal}
              currency={currency}
              /*
               * The reassurance is a CLAIM, so it is made only when it is true
               * — and it is only true once the server has confirmed the figure.
               *
               * It used to appear while the screen was showing a client
               * preview, which meant it was reassuring the customer about a
               * number nobody had checked. Now it waits for `serverFare`, and
               * says so: this is the price, confirmed, and it matches.
               */
              reassurance={
                serverFare && !priceChanged && carried
                  ? `Confirmed at ${formatCurrency(serverFare.total, currency)} — the same price you chose the car on.`
                  : undefined
              }
            />
          </Card>
        ) : null}

        {/*
          THE INTERSTITIAL. Renders only when the server's figure differs from
          the one the customer authorised, and the flow is already stopped
          before Stripe by the time it appears.

          It does not guess WHY the number moved. The old copy asserted a
          late-night surcharge as the cause, which it could not know: a promo
          code, waiting time, an extra stop or a rate change would all land
          here too. The breakdown above shows which line differs; this states
          the two totals and nothing it cannot support.
        */}
        {priceChanged && serverFare && carried ? (
          <Card style={styles.changedCard}>
            <AppText variant="subheading" color={theme.content.accentEmphasis} accessibilityRole="header">
              The price changed
            </AppText>
            <AppText variant="captionSm" style={styles.changedBody} accessibilityLiveRegion="polite">
              {`You chose this car at ${formatCurrency(carried.totalFare)}. Our system has priced the booking at ${formatCurrency(
                serverFare.total,
                currency,
              )} — the breakdown above is the confirmed one. Nothing has been charged. Authorise the new total, or go back and change your booking.`}
            </AppText>
          </Card>
        ) : null}

        <AppText variant="section" style={styles.sectionHeader}>
          Payment method
        </AppText>

        <Card style={styles.selectedCard}>
          <View style={styles.methodRow}>
            <CreditCard size={iconSize.lg} color={theme.content.secondary} strokeWidth={iconStroke.decorative} />
            <View style={styles.methodText}>
              <AppText variant="subheading">Card on file</AppText>
              <AppText variant="captionSm">
                {isStripeConfigured ? 'Charged when your chauffeur is assigned' : 'Card payment is not set up on this build'}
              </AppText>
            </View>
            <Check size={iconSize.md} color={theme.content.accent} strokeWidth={2} />
          </View>
        </Card>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a card"
          onPress={() => router.push('/(app)/account/payment-methods')}
          style={styles.addCard}
        >
          <Plus size={iconSize.sm} color={theme.content.accentSoft} strokeWidth={iconStroke.interactive} />
          <AppText variant="caption" color={theme.content.accentSoft} style={styles.addCardLabel}>
            Add a card
          </AppText>
        </Pressable>

        {error ?? storeError ? (
          <AppText variant="caption" color={theme.content.danger} style={styles.error}>
            {error ?? storeError}
          </AppText>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <AuthGate
          title="Create your account to complete your reservation"
          message="You're one step away — sign in or create a free account to confirm. Your trip details are saved."
          onContinueLater={() => router.push('/(app)')}
        >
          {/*
            The label always names the number being authorised, and after a
            price change that is the SERVER's number — the customer is pressing
            a button that states what they will be charged.
          */}
          <Button
            label={
              total ? (priceChanged ? `Authorise the new total, ${total}` : `Authorise ${total}`) : 'Authorise'
            }
            loading={submitting || processing}
            disabled={shownTotal === null}
            disabledReason="Pick a car first"
            haptic
            onPress={handlePayAndConfirm}
          />
          {/*
            The published window for THIS service type — 6 hours on an airport
            transfer, 12 on a point-to-point, 48 on hourly or an event. Not a
            generic line: telling an airport customer "12 hours" would be as
            wrong as inventing a figure. Null (a quote-routed custom booking)
            still renders nothing.
          */}
          {cancellationSentenceFor(draft.serviceType) ? (
            <AppText variant="captionSm" center style={styles.policy}>
              {cancellationSentenceFor(draft.serviceType)}
            </AppText>
          ) : null}
          {/*
            The complimentary wait, resolved by service — 60 minutes on an
            airport transfer, 30 otherwise. This slot rendered nothing for the
            whole project because the figure was a blocked business input; it
            now has a confirmed answer and states it.

            It belongs beside a price the customer is about to authorise
            because it IS part of the price: it is the span in which waiting
            costs nothing.
          */}
          {complimentaryWaitSentenceFor(draft.serviceType) ? (
            <AppText variant="captionSm" center style={styles.policy}>
              {complimentaryWaitSentenceFor(draft.serviceType)}
            </AppText>
          ) : null}
        </AuthGate>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.mdl, paddingTop: space.xs },
  railWrap: { flex: 1, marginStart: space.smd },
  body: { paddingHorizontal: gutter, paddingTop: space.mdl, paddingBottom: space.xl },
  card: { marginBottom: 14 },
  sectionHeader: { marginBottom: 9 },
  changedCard: { marginBottom: 14, borderColor: theme.border.accent },
  changedBody: { marginTop: 6 },
  selectedCard: { marginBottom: 9, borderColor: theme.border.selected },
  methodRow: { flexDirection: 'row', alignItems: 'center' },
  methodText: { flex: 1, marginHorizontal: space.smd },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.border.accent,
  },
  addCardLabel: { marginStart: space.sm },
  error: { marginTop: space.md },
  footer: { paddingHorizontal: gutter, paddingBottom: space.mdl, paddingTop: space.sm },
  policy: { marginTop: space.smd },
});

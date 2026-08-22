import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { AppText } from '../../../src/components/ui/Typography';
import { colors, spacing } from '../../../src/theme/tokens';
import { corporateApi } from '../../../src/api/corporate';
import type { Booking, CorporateAccount, Profile } from '../../../src/types/api';
import { useAuthStore } from '../../../src/store/authStore';
import { formatCurrency, formatDateTime } from '../../../src/lib/format';

export default function CorporateScreen() {
  const profile = useAuthStore((s) => s.profile);
  const isApprover = profile?.corporate_role === 'manager' || profile?.corporate_role === 'admin';
  const [account, setAccount] = useState<CorporateAccount | null>(null);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [pending, setPending] = useState<Booking[]>([]);
  const [loadError, setLoadError] = useState<Error | null>(null);
  /*
   * Distinguishes "not back yet" from "came back empty". Without it, the empty
   * state below would flash on every mount before the request resolves.
   */
  const [settled, setSettled] = useState(false);

  const load = useCallback(() => {
    setLoadError(null);
    setSettled(false);
    const fail = (cause: unknown) =>
      setLoadError(cause instanceof Error ? cause : new Error(String(cause)));

    /*
     * These three used to swallow their rejection with an empty catch, which
     * rendered an EMPTY corporate screen on failure: a customer whose profile
     * genuinely HAS a corporate account was shown one that looked like it held
     * nothing. That is a screen that lies — the one category that always gets
     * fixed — and it is one tap from Account, so a client reaches it.
     *
     * An error branch is a fix, not a redesign. The screen's layout, copy and
     * behaviour on the success path are untouched.
     */
    corporateApi
      .account()
      .then(setAccount)
      .catch(fail)
      .finally(() => setSettled(true));
    if (isApprover) {
      corporateApi.employees().then(setEmployees).catch(fail);
      corporateApi.bookings('pending_approval').then(setPending).catch(fail);
    }
  }, [isApprover]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleApprove(id: string) {
    await corporateApi.approveBooking(id);
    load();
  }

  async function handleReject(id: string) {
    await corporateApi.rejectBooking(id);
    load();
  }

  // A failed load says so and offers a retry. It never renders the success
  // layout with empty data, because that reads as "your company has nothing
  // here" rather than "we could not reach it".
  /*
   * `settled && !account` is the SAME failure wearing different clothes: the
   * customer's profile carries a `corporate_account_id`, which is the only
   * reason this screen is reachable, yet the account came back empty. Rendering
   * the normal layout there produces a page that reads "your company has
   * nothing set up" when the truth is "we could not resolve it". Both cases get
   * the same honest answer and the same retry.
   */
  const unresolved = Boolean(loadError) || (settled && !account && Boolean(profile?.corporate_account_id));

  if (unresolved) {
    return (
      <ScreenContainer>
        <AppText variant="title" style={{ marginBottom: spacing.lg }}>
          Corporate Account
        </AppText>
        <ErrorState
          title="We couldn’t load your company’s details"
          message="Your account is unaffected — this is on our end."
          onRetry={load}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppText variant="title" style={{ marginBottom: spacing.lg }}>
        Corporate Account
      </AppText>

      {account ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <AppText variant="subheading">{account.company_name}</AppText>
          <AppText variant="caption">{account.billing_email}</AppText>
          {account.requires_ride_approval ? (
            <AppText variant="caption" color={colors.gold} style={{ marginTop: spacing.xs }}>
              Ride approval required for employees
            </AppText>
          ) : null}
        </Card>
      ) : null}

      {!isApprover ? (
        <AppText variant="bodyMuted">
          You&apos;re a member of this company account. Ride approvals and employee management are available to
          managers and admins.
        </AppText>
      ) : (
        <>
          <AppText variant="heading" style={{ marginBottom: spacing.sm }}>
            Pending Approvals
          </AppText>
          {pending.length === 0 ? <AppText variant="bodyMuted">Nothing awaiting approval.</AppText> : null}
          {pending.map((booking) => (
            <Card key={booking.id} style={{ marginBottom: spacing.sm }}>
              <AppText variant="subheading">{formatDateTime(booking.scheduled_at)}</AppText>
              <AppText variant="caption" style={{ marginBottom: spacing.sm }}>
                {booking.pickup_address} · {formatCurrency(booking.total_fare, booking.currency)}
              </AppText>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button label="Approve" onPress={() => handleApprove(booking.id)} style={{ flex: 1 }} />
                <Button label="Reject" variant="danger" onPress={() => handleReject(booking.id)} style={{ flex: 1 }} />
              </View>
            </Card>
          ))}

          <AppText variant="heading" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
            Employees
          </AppText>
          {employees.map((e) => (
            <Card key={e.id} style={{ marginBottom: spacing.sm }}>
              <AppText variant="subheading">{e.full_name}</AppText>
              <AppText variant="caption">{e.email} · {e.corporate_role}</AppText>
            </Card>
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

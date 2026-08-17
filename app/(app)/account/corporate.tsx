import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
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

  const load = useCallback(() => {
    corporateApi.account().then(setAccount).catch(() => {});
    if (isApprover) {
      corporateApi.employees().then(setEmployees).catch(() => {});
      corporateApi.bookings('pending_approval').then(setPending).catch(() => {});
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

import { StyleSheet, View } from 'react-native';
import { AppText } from './Typography';
import { Divider } from './Divider';
import { colors, spacing } from '../../theme/tokens';
import { formatCurrency } from '../../lib/format';

interface Props {
  baseFare: number | string;
  distanceFare: number | string;
  timeFare: number | string;
  surcharges?: number | string;
  gratuity?: number | string;
  tax?: number | string;
  totalFare: number | string;
  currency?: string;
}

function isNonZero(value: number | string | undefined): value is number | string {
  if (value === undefined) return false;
  return Number(value) !== 0;
}

function Row({ label, value, currency }: { label: string; value: number | string; currency: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="bodyMuted">{label}</AppText>
      <AppText variant="body">{formatCurrency(value, currency)}</AppText>
    </View>
  );
}

/** Line-item fare breakdown matching the Booking fare fields the backend returns 1:1 — no invented line items. */
export function PriceBreakdown({
  baseFare,
  distanceFare,
  timeFare,
  surcharges,
  gratuity,
  tax,
  totalFare,
  currency = 'usd',
}: Props) {
  return (
    <View>
      <Row label="Base Fare" value={baseFare} currency={currency} />
      {isNonZero(distanceFare) ? <Row label="Distance" value={distanceFare} currency={currency} /> : null}
      {isNonZero(timeFare) ? <Row label="Time" value={timeFare} currency={currency} /> : null}
      {isNonZero(surcharges) ? <Row label="Surcharges" value={surcharges} currency={currency} /> : null}
      {isNonZero(gratuity) ? <Row label="Gratuity" value={gratuity} currency={currency} /> : null}
      {isNonZero(tax) ? <Row label="Tax" value={tax} currency={currency} /> : null}
      <Divider style={styles.divider} />
      <View style={styles.row}>
        <AppText variant="subheading">Total</AppText>
        <AppText variant="subheading" color={colors.gold}>
          {formatCurrency(totalFare, currency)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  divider: { marginVertical: spacing.sm },
});

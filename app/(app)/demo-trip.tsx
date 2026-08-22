import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Star, Car, Info } from 'lucide-react-native';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { StatusPill } from '../../src/components/ui/StatusPill';
import { AppText } from '../../src/components/ui/Typography';
import { FadeSlideIn } from '../../src/components/ui/FadeSlideIn';
import { AnimatedRoutePreview } from '../../src/components/trip/AnimatedRoutePreview';
import { colors, radius, spacing } from '../../src/theme/tokens';
import { TRIP_STAGE_ORDER, TRIP_STATUS_LABELS, type TripStatus } from '../../src/lib/tripStatus';

const DEMO_STAGES: TripStatus[] = TRIP_STAGE_ORDER.filter((s) => s !== 'pending');
const STAGE_DURATION_MS = 3200;

/**
 * A labelled preview of the tracking UI.
 *
 * Everything that would identify a real person or car has been removed: the
 * invented name, the star rating, the "7 years / 2,400+ trips" tenure, the
 * "Obsidian Black" colour and the "LCT-4471" plate. Plate, colour and tenure do
 * not exist in the backend at all (BACKEND_FOLLOWUPS.md sections 1 and 2), and
 * a preview that shows them makes fields look shipped that are not. The rating
 * is dropped for the separate reason that a star rating on a chauffeur is the
 * mass-market tell this redesign removes.
 *
 * What remains is what the screen is actually for: the status timeline, the
 * animated route and the ETA.
 */
const DEMO_DRIVER = {
  name: 'Your chauffeur',
  vehicle: 'Executive Sedan',
};

export default function DemoTripScreen() {
  const router = useRouter();
  const [stageIndex, setStageIndex] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setStageIndex((i) => {
        if (i >= DEMO_STAGES.length - 1) {
          setRunning(false);
          return i;
        }
        return i + 1;
      });
    }, STAGE_DURATION_MS);
    return () => clearInterval(timer);
  }, [running]);

  const status = DEMO_STAGES[stageIndex] ?? 'confirmed';
  const etaMinutes = Math.max(12 - stageIndex * 2, 1);
  const isComplete = status === 'completed';

  function handleRestart() {
    setStageIndex(0);
    setRunning(true);
  }

  return (
    <ScreenContainer>
      <AppText variant="eyebrow" style={{ marginBottom: spacing.xs }}>
        Live Tracking Demo
      </AppText>
      <AppText variant="title" style={{ marginBottom: spacing.xs }}>
        Airport Transfer Preview
      </AppText>
      <View style={{ marginBottom: spacing.md }}>
        <StatusPill status={status} />
      </View>

      <FadeSlideIn>
        <Card style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={styles.avatarPlaceholder}>
              <AppText variant="heading" color={colors.gold}>
                {DEMO_DRIVER.name.charAt(0)}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="subheading">{DEMO_DRIVER.name}</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Star size={12} color={colors.gold} strokeWidth={1.5} fill={colors.gold} />
                <AppText variant="caption" style={{ marginLeft: 4 }}>
                  Assigned ahead of pickup
                </AppText>
              </View>
            </View>
            {!isComplete ? (
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="caption">ETA</AppText>
                <AppText variant="subheading" color={colors.gold}>
                  {etaMinutes} min
                </AppText>
              </View>
            ) : null}
          </View>
          <View style={styles.vehicleRow}>
            <Car size={16} color={colors.mutedForeground} strokeWidth={1.5} />
            <AppText variant="caption" style={{ marginLeft: spacing.xs }}>
              {DEMO_DRIVER.vehicle}
            </AppText>
          </View>
        </Card>
      </FadeSlideIn>

      <FadeSlideIn delay={80}>
        <Card style={{ marginBottom: spacing.md, padding: 0, overflow: 'hidden' }}>
          <AnimatedRoutePreview />
        </Card>
      </FadeSlideIn>

      <FadeSlideIn delay={140}>
        <Card style={{ marginBottom: spacing.md }}>
          {DEMO_STAGES.map((stage, i) => {
            const done = i < stageIndex || (i === stageIndex && stage === 'completed');
            const active = i === stageIndex && stage !== 'completed';
            return (
              <View key={stage} style={styles.stageRow}>
                <View style={[styles.dot, done || active ? styles.dotActive : null]} />
                <AppText
                  variant={active ? 'subheading' : 'body'}
                  color={done || active ? colors.offWhite : colors.mutedForeground}
                  style={{ flex: 1 }}
                >
                  {TRIP_STATUS_LABELS[stage]}
                </AppText>
              </View>
            );
          })}
        </Card>
      </FadeSlideIn>

      <FadeSlideIn delay={200}>
        <View style={styles.noticeRow}>
          <Info size={16} color={colors.mutedForeground} strokeWidth={1.5} />
          <AppText variant="caption" style={{ marginLeft: spacing.xs, flex: 1 }}>
            This is a simulated preview. Your real trips are tracked live once you book.
          </AppText>
        </View>

        {isComplete ? (
          <Button label="Restart Demo" variant="secondary" onPress={handleRestart} style={{ marginTop: spacing.md }} />
        ) : null}
        <Button label="Book a Real Trip" onPress={() => router.push('/(app)/book')} style={{ marginTop: spacing.sm }} />
      </FadeSlideIn>
    </ScreenContainer>
  );
}

const styles = {
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.charcoal,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  vehicleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stageRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm, marginBottom: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: radius.full, backgroundColor: colors.charcoal },
  dotActive: { backgroundColor: colors.gold },
  noticeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: spacing.sm },
};

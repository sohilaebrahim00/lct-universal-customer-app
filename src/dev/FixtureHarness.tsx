import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { HomeView, type HomeData } from '../components/home/HomeView';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { AppText } from '../components/ui/Typography';
import { gutter, space, theme } from '../theme';
import { asyncState, type AsyncState } from '../lib/asyncState';
import {
  EXCLUSION_MARKER,
  FIXTURE_DRIVER,
  FIXTURE_NOW,
  FIXTURE_PAST,
  FIXTURE_PROFILE,
  FIXTURE_TRIP_VEHICLE,
  FIXTURE_UPCOMING,
  FIXTURE_VEHICLE_NAMES,
} from './fixtures';

/**
 * The fixture harness — a state switcher over the real screen components.
 *
 * It renders `HomeView` itself, not a look-alike, so a screenshot taken here is
 * a screenshot of the shipping component. Only the data is substituted.
 *
 * The FIXTURE banner is permanent and unmissable by design. Every value below
 * also carries the `FIXTURE` prefix. Between the two it should be impossible to
 * mistake one of these screens for real data in a deck or a review.
 */

type Case = 'populated' | 'loading' | 'error' | 'empty';

const POPULATED: HomeData = {
  next: { booking: FIXTURE_UPCOMING, driver: FIXTURE_DRIVER, vehicle: FIXTURE_TRIP_VEHICLE },
  rebook: FIXTURE_PAST,
  vehicleNames: FIXTURE_VEHICLE_NAMES,
};

const STATES: Record<Case, AsyncState<HomeData>> = {
  populated: asyncState.success(POPULATED),
  loading: asyncState.loading<HomeData>(),
  error: asyncState.error<HomeData>(new Error(`${EXCLUSION_MARKER}: simulated network failure`)),
  empty: asyncState.success<HomeData>({ next: null, rebook: [], vehicleNames: {} }),
};

export function FixtureBanner({ label }: { label: string }) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <AppText variant="micro" color={theme.content.onAccent}>
        {`Fixture data · ${label} · not real`}
      </AppText>
    </View>
  );
}

export function FixtureHarness() {
  const [state, setState] = useState<Case>('populated');

  return (
    <View style={styles.root}>
      <FixtureBanner label="dev harness" />

      <View style={styles.switcher}>
        <SegmentedControl<Case>
          segments={[
            { value: 'populated', label: 'Populated' },
            { value: 'loading', label: 'Loading' },
            { value: 'error', label: 'Failed' },
            { value: 'empty', label: 'Empty' },
          ]}
          value={state}
          onChange={setState}
        />
      </View>

      <View style={styles.stage}>
        <HomeView
          state={STATES[state]}
          firstName={FIXTURE_PROFILE.full_name.split(' ')[1] ?? null}
          fullName={FIXTURE_PROFILE.full_name}
          avatarUrl={FIXTURE_PROFILE.avatar_url}
          now={FIXTURE_NOW}
          onRetry={() => setState('populated')}
          onStartBooking={() => {}}
          onRebook={() => {}}
          onOpenTrip={() => {}}
        />
      </View>
    </View>
  );
}

/** Renders one state full-bleed, for a clean screenshot without the switcher. */
export function FixtureHomeState({ state }: { state: Case }) {
  return (
    <View style={styles.root}>
      <FixtureBanner label={`home · ${state}`} />
      <View style={styles.stage}>
        <HomeView
          state={STATES[state]}
          firstName={FIXTURE_PROFILE.full_name.split(' ')[1] ?? null}
          fullName={FIXTURE_PROFILE.full_name}
          avatarUrl={FIXTURE_PROFILE.avatar_url}
          now={FIXTURE_NOW}
          onRetry={() => {}}
          onStartBooking={() => {}}
          onRebook={() => {}}
          onOpenTrip={() => {}}
        />
      </View>
    </View>
  );
}

/** Unused visually; keeps the harness explorable when more screens are added. */
export function FixtureIndex() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.indexContent}>
      <FixtureBanner label="index" />
      <AppText variant="body">Open ?state=populated|loading|error|empty</AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background.primary },
  banner: {
    backgroundColor: theme.content.warning,
    paddingVertical: 6,
    paddingHorizontal: gutter,
    alignItems: 'center',
  },
  switcher: { paddingHorizontal: gutter, paddingVertical: space.sm },
  stage: { flex: 1, borderTopWidth: 1, borderTopColor: theme.border.hairline },
  indexContent: { padding: gutter },
});

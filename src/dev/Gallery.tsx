import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ArrowRight, Bell, CalendarX, CreditCard, MapPin, Plus, Trash2, X } from 'lucide-react-native';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { BottomSheet } from '../components/ui/BottomSheet';
import { ConnectivityBanner } from '../components/ui/ConnectivityBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { PriceBreakdown } from '../components/ui/PriceBreakdown';
import { ProgressRail } from '../components/ui/ProgressRail';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionHeader } from '../components/ui/SectionHeader';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Sheet } from '../components/ui/Sheet';
import { Stepper } from '../components/ui/Stepper';
import { TripCard } from '../components/ui/TripCard';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { IconButton } from '../components/ui/IconButton';
import { ListRow } from '../components/ui/ListRow';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusPill } from '../components/ui/StatusPill';
import { Surface } from '../components/ui/Surface';
import { TextField } from '../components/ui/TextField';
import { AppText, type Variant } from '../components/ui/Typography';
import { gutter, space, theme } from '../theme';
import { TRIP_STAGE_ORDER } from '../lib/tripStatus';

/**
 * The design-system gallery. Every primitive, every state, one scroll.
 *
 * This is the review surface for the component layer: if a state is not on this
 * page it has not been designed, and a regression in one shows up here before it
 * shows up in a screen.
 *
 * Dev-only — see app/_dev/gallery.tsx for how that is enforced and what its
 * honest limit is.
 */

const TYPE_ROLES: Variant[] = [
  'display',
  'title',
  'heading',
  'headingSm',
  'figure',
  'section',
  'eyebrow',
  'subheading',
  'body',
  'bodyLead',
  'bodySm',
  'caption',
  'captionSm',
  'micro',
  'label',
  'tabLabel',
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="section" style={styles.sectionTitle}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <AppText variant="captionSm" style={styles.rowLabel}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

export function Gallery() {
  const [text, setText] = useState('');
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<'border' | 'rail' | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [guests, setGuests] = useState(2);
  const [sheetOpen, setSheetOpen] = useState(false);
  const toast = useToast();

  // A fixed instant, so the gallery's TripCard renders the same date every run
  // and a screenshot diff is a real change rather than the clock moving.
  const sampleDate = '2026-08-22T13:15:00.000Z';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <AppText variant="title">Design system</AppText>
      <AppText variant="captionSm" style={styles.intro}>
        Every primitive in every state. Dev build only.
      </AppText>

      <Section title="Type scale">
        {TYPE_ROLES.map((role) => (
          <View key={role} style={styles.typeRow}>
            <AppText variant={role}>The chauffeur is on the way · 18.4 mi · $261.00</AppText>
            <AppText variant="captionSm" style={styles.typeMeta}>
              {role}
            </AppText>
          </View>
        ))}
      </Section>

      <Section title="Surfaces & elevation">
        {(['row', 'card', 'cardProminent', 'sheet', 'inset'] as const).map((level) => (
          <Surface key={level} level={level} style={styles.surfaceSwatch}>
            <AppText variant="caption" color={theme.content.primary}>
              {level}
            </AppText>
          </Surface>
        ))}
      </Section>

      <Section title="Button · variants">
        <Row label="primary">
          <Button label="Reserve · $261" onPress={() => {}} />
        </Row>
        <Row label="secondary">
          <Button label="Explore fleet" variant="secondary" onPress={() => {}} />
        </Row>
        <Row label="ghost">
          <Button label="Continue later" variant="ghost" onPress={() => {}} />
        </Row>
        <Row label="danger">
          <Button label="Cancel trip" variant="danger" onPress={() => {}} />
        </Row>
      </Section>

      <Section title="Button · sizes">
        <Row label="lg (52)">
          <Button label="Large" size="lg" onPress={() => {}} />
        </Row>
        <Row label="md (46)">
          <Button label="Medium" size="md" onPress={() => {}} />
        </Row>
        <Row label="sm (40)">
          <Button label="Small" size="sm" onPress={() => {}} />
        </Row>
      </Section>

      <Section title="Button · states">
        <Row label="loading — keeps its label and its width">
          <Button label="Reserve · $261" loading onPress={() => {}} />
        </Row>
        <Row label="disabled — legible, and says why">
          <Button label="Reserve" disabled disabledReason="Pick a vehicle first" onPress={() => {}} />
        </Row>
        <Row label="icon leading / trailing">
          <Button label="Continue" iconTrailing={ArrowRight} onPress={() => {}} />
        </Row>
        <Row label="secondary + icon">
          <Button label="Add a card" variant="secondary" iconLeading={Plus} onPress={() => {}} />
        </Row>
        <Row label="focus — tab to it on web, or use a keyboard">
          <Button label="Focusable" variant="secondary" onPress={() => {}} />
        </Row>
      </Section>

      <Section title="TextField">
        <TextField label="Email" placeholder="you@company.com" value={text} onChangeText={setText} />
        <TextField
          label="Flight number"
          placeholder="e.g. AA 1194"
          helperText="Optional — enables flight tracking"
          value=""
          onChangeText={() => {}}
        />
        <TextField label="Flight number" value="AA 11" onChangeText={() => {}} error="Flight numbers are 3–4 digits." />
        <TextField placeholder="No label — the prop is optional" value="" onChangeText={() => {}} />
        <TextField
          label="Notes for your chauffeur"
          placeholder="Child seat, extra stop, meet-and-greet sign…"
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={200}
          counter
        />
      </Section>

      <Section title="Card">
        <Card style={styles.stack}>
          <AppText variant="subheading">Default</AppText>
          <AppText variant="captionSm">Fill, specular edge, hairline, warm contact shadow.</AppText>
        </Card>
        <Card prominent style={styles.stack}>
          <AppText variant="subheading">Prominent</AppText>
          <AppText variant="captionSm">The one card that outranks the others.</AppText>
        </Card>
        <Card elevated={false} style={styles.stack}>
          <AppText variant="subheading">Flat</AppText>
          <AppText variant="captionSm">No shadow; fill and edge only.</AppText>
        </Card>
        <Card active={selected === 'border'} style={styles.stack}>
          <AppText variant="subheading">Selected · border</AppText>
          <AppText variant="captionSm">Border width is constant — content never shifts on tap.</AppText>
          <Button
            label={selected === 'border' ? 'Deselect' : 'Select'}
            size="sm"
            variant="secondary"
            onPress={() => setSelected(selected === 'border' ? null : 'border')}
            style={styles.stackButton}
          />
        </Card>
        <Card active={selected === 'rail'} selection="rail" style={styles.stack}>
          <AppText variant="subheading">Selected · rail</AppText>
          <AppText variant="captionSm">4pt gold bar on the trailing edge.</AppText>
          <Button
            label={selected === 'rail' ? 'Deselect' : 'Select'}
            size="sm"
            variant="secondary"
            onPress={() => setSelected(selected === 'rail' ? null : 'rail')}
            style={styles.stackButton}
          />
        </Card>
      </Section>

      <Section title="IconButton — every one has a label and a 44pt target">
        <View style={styles.inline}>
          <IconButton icon={X} accessibilityLabel="Close" onPress={() => {}} />
          <IconButton icon={MapPin} accessibilityLabel="Use current location" variant="outlined" onPress={() => {}} />
          <IconButton icon={ArrowRight} accessibilityLabel="Back" variant="circular" onPress={() => {}} />
          <IconButton icon={MapPin} accessibilityLabel="Recentre map" variant="overlay" onPress={() => {}} />
          <IconButton icon={Trash2} accessibilityLabel="Delete saved card" color={theme.content.danger} onPress={() => {}} />
          <IconButton icon={Bell} accessibilityLabel="Notifications" disabled onPress={() => {}} />
        </View>
      </Section>

      <Section title="ListRow">
        <Surface level="card" style={styles.group}>
          <ListRow icon={MapPin} title="Saved locations" value="3" onPress={() => {}} />
          <ListRow icon={CreditCard} title="Payment methods" value="Amex ···· 4021" onPress={() => {}} />
          <ListRow icon={Bell} title="Trip notifications" subtitle="Driver assigned, arriving, completed" onPress={() => {}} />
          <ListRow title="No icon, no chevron" chevron={false} divider={false} />
        </Surface>
        <Surface level="card" style={styles.group}>
          <ListRow icon={Trash2} title="Delete this location" destructive divider={false} onPress={() => {}} />
        </Surface>
      </Section>

      <Section title="StatusPill · every trip status">
        <View style={styles.inline}>
          {TRIP_STAGE_ORDER.map((s) => (
            <StatusPill key={s} status={s} />
          ))}
          <StatusPill status="cancelled" />
        </View>
      </Section>

      <Section title="StatusPill · semantic tones">
        <View style={styles.inline}>
          <StatusPill label="Neutral" tone="neutral" />
          <StatusPill label="Info" tone="info" />
          <StatusPill label="Success" tone="success" />
          <StatusPill label="Warning" tone="warning" />
          <StatusPill label="Danger" tone="danger" />
        </View>
      </Section>

      <Section title="Avatar">
        <View style={styles.inline}>
          <Avatar name="Michael Okafor" size="lg" />
          <Avatar name="Daniel A." size="md" />
          <Avatar name="Sam" size="sm" />
          <Avatar size="md" />
        </View>
      </Section>


      <Section title="SegmentedControl">
        <SegmentedControl
          segments={[
            { value: 'upcoming', label: 'Upcoming', count: 2 },
            { value: 'past', label: 'Past', count: 14 },
          ]}
          value={tab}
          onChange={setTab}
        />
      </Section>

      <Section title="Badge">
        <View style={styles.inline}>
          <Badge label="Neutral" />
          <Badge label="Corporate account" tone="accent" />
          <Badge label="Completed" tone="success" />
          <Badge label="Payment failed" tone="danger" />
          <Badge label="Live" tone="success" dot />
        </View>
      </Section>

      <Section title="Stepper — 44pt targets, adjustable to a screen reader">
        <Stepper label="Guests" unit={guests === 1 ? 'guest' : 'guests'} value={guests} onChange={setGuests} min={1} max={12} />
      </Section>

      <Section title="ProgressRail — rides on all five booking steps">
        {[1, 3, 5].map((step) => (
          <View key={step} style={styles.stack}>
            <ProgressRail step={step} total={5} label={['Pickup', 'When & who', 'Review & pay'][[1, 3, 5].indexOf(step)]} />
          </View>
        ))}
      </Section>

      <Section title="ScreenHeader / SectionHeader">
        <ScreenHeader title="Account" onBack={() => {}} />
        <SectionHeader title="Travel" />
        <SectionHeader title="Book again" actionLabel="See all" onAction={() => {}} />
      </Section>

      <Section title="TripCard — one card, live trip carries a rail">
        <TripCard
          route="1240 Hillcrest Rd → LAX T7"
          scheduledAt={sampleDate}
          status="driver_assigned"
          totalFare={261}
          meta="Executive Sedan"
          onPress={() => {}}
        />
        <TripCard route="SFO → Nob Hill" scheduledAt={sampleDate} status="completed" totalFare={198} meta="Executive Sedan" />
      </Section>

      <Section title="PriceBreakdown — expanded by default">
        <Card>
          <PriceBreakdown
            lines={[
              { label: 'Base fare', amount: 145 },
              { label: 'Distance · 18.4 mi', amount: 58 },
              { label: 'Gratuity · 20%', amount: 40.6 },
              { label: 'Tax', amount: 17.4 },
            ]}
            total={261}
          />
        </Card>
      </Section>

      <Section title="States — empty, failed, offline">
        <Card style={styles.stack}>
          <EmptyState
            icon={CalendarX}
            title="No upcoming trips"
            message="When you book a car, it will show up here."
            action={<Button label="Book a car" onPress={() => {}} />}
          />
        </Card>
        <Card style={styles.stack}>
          {/*
            "Call dispatch" is absent because servicePolicy.dispatchPhone is
            null — a blocked business input. This is what the state looks like
            today, not a broken render.
          */}
          <ErrorState
            title="We couldn't load your trips"
            message="Your trips are safe — this is our end."
            onRetry={() => {}}
          />
        </Card>
        <ConnectivityBanner lastSyncedLabel="9:12 AM" />
      </Section>

      <Section title="Toast">
        <View style={styles.inline}>
          <Button label="Success" size="sm" variant="secondary" onPress={() => toast.show('Trip cancelled', 'success')} />
          <Button label="Error" size="sm" variant="secondary" onPress={() => toast.show('Could not cancel — try again', 'error')} />
          <Button label="Info" size="sm" variant="secondary" onPress={() => toast.show('Saved to your locations', 'info')} />
        </View>
      </Section>

      <Section title="BottomSheet — in-place; route sheets use sheetScreenOptions()">
        <Button label="Open sheet" variant="secondary" onPress={() => setSheetOpen(true)} />
        <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Set pickup">
          <Sheet>
            <AppText variant="body">
              Drag the grabber down, or flick past 500 px/s, to dismiss.
            </AppText>
          </Sheet>
        </BottomSheet>
      </Section>

      <Section title="Skeleton">
        <Skeleton.Bar width={140} height={12} />
        <View style={styles.gap} />
        <Skeleton.Card />
        <View style={styles.gap} />
        <Skeleton.List count={2} />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background.primary },
  content: { padding: gutter, paddingBottom: space.xxl },
  intro: { marginBottom: space.lg },
  section: { marginBottom: space.xl },
  sectionTitle: { marginBottom: space.smd },
  row: { marginBottom: space.smd },
  rowLabel: { marginBottom: space.xs },
  typeRow: { marginBottom: space.smd },
  typeMeta: { marginTop: 2, color: theme.content.quaternary },
  surfaceSwatch: { padding: space.md, marginBottom: space.sm },
  stack: { marginBottom: space.sm },
  stackButton: { marginTop: space.sm, alignSelf: 'flex-start' },
  inline: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  group: { marginBottom: space.sm },
  gap: { height: space.smd },
});

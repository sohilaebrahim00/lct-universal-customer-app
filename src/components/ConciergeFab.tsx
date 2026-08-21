import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import { Button } from './ui/Button';
import { TextField } from './ui/TextField';
import { AppText } from './ui/Typography';
import { colors, radius, shadows, spacing } from '../theme/tokens';
import { conciergeApi, type ConciergeMessage } from '../api/concierge';
import { useBookingFormStore } from '../store/bookingFormStore';
import { CONCIERGE_QUICK_ACTIONS } from '../lib/conciergeQuickActions';

const GREETING: ConciergeMessage = {
  role: 'assistant',
  content: "Hi, I'm the LCT Universal Concierge — your personal transportation assistant. How can I help with your trip today?",
};

function Bubble({ message }: { message: ConciergeMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : null]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <AppText variant="body" color={isUser ? colors.surfaceBlack : colors.offWhite}>
          {message.content}
        </AppText>
      </View>
    </View>
  );
}

interface FabProps {
  /**
   * Height of the tab bar this floats above, excluding the safe-area inset —
   * the layout owns that number and passes it down. It used to be a hardcoded
   * `bottom: 96`, derived from the old hardcoded 84pt tab bar, so it drifted on
   * every device that wasn't a notched iPhone (audit P2-6).
   */
  bottomOffset?: number;
}

export function ConciergeFab({ bottomOffset = 54 }: FabProps) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ConciergeMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [readyToBook, setReadyToBook] = useState<{ serviceType: string; pickupAddress: string | null; dropoffAddress: string | null; passengerCount: number | null } | null>(null);
  const listRef = useRef<FlatList<ConciergeMessage>>(null);
  const updateDraft = useBookingFormStore((s) => s.update);
  const resetDraft = useBookingFormStore((s) => s.reset);

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  /*
   * Hidden on the Concierge tab itself, and now also on Home.
   *
   * Home carries a sticky primary action ("Book a car"), and a floating gold
   * circle sitting on top of a gold primary button is two competing accents
   * inside the same 70pt of screen — the thing the one-primary-action rule
   * exists to prevent. It was also a literal overlap: both landed at the same
   * offset above the tab bar.
   *
   * The design's artboards show no FAB on any screen, and Concierge is one of
   * the five tabs, so it is never more than one tap away. Flagged rather than
   * deleted outright: whether the FAB earns its place at all now is a product
   * call, not a layout one.
   */
  const onHome = pathname === '/' || pathname === '/(app)' || pathname === '/(app)/index';
  if (pathname?.includes('concierge') || onHome) return null;

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const next = [...messages, { role: 'user' as const, content: text.trim() }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setReadyToBook(null);

    try {
      const intent = await conciergeApi.send(next);
      setMessages((prev) => [...prev, { role: 'assistant', content: intent.assistantReply }]);
      if (intent.serviceType && intent.missingFields.length === 0) {
        setReadyToBook({
          serviceType: intent.serviceType,
          pickupAddress: intent.pickupAddress,
          dropoffAddress: intent.dropoffAddress,
          passengerCount: intent.passengerCount,
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: err instanceof Error ? err.message : 'Something went wrong — please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function startBookingFromIntent() {
    if (!readyToBook) return;
    setOpen(false);
    resetDraft();
    updateDraft({
      serviceType: readyToBook.serviceType as never,
      pickupAddress: readyToBook.pickupAddress ?? '',
      dropoffAddress: readyToBook.dropoffAddress ?? '',
      passengerCount: readyToBook.passengerCount ?? 1,
    });
    router.push('/(app)/book/vehicle');
  }

  return (
    <>
      <Pressable
        style={[styles.fab, { bottom: bottomOffset + insets.bottom + spacing.md }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Open AI Concierge"
      >
        <Sparkles size={24} color={colors.surfaceBlack} strokeWidth={1.5} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <AppText variant="subheading">AI Concierge</AppText>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <X size={22} color={colors.mutedForeground} strokeWidth={1.5} />
              </Pressable>
            </View>

            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => <Bubble message={item} />}
              contentContainerStyle={{ padding: spacing.lg }}
              style={{ maxHeight: 320 }}
            />

            {loading ? <ActivityIndicator color={colors.gold} style={{ marginBottom: spacing.sm }} /> : null}

            {readyToBook ? (
              <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
                <Button label="Continue to Vehicle Selection" onPress={startBookingFromIntent} />
              </View>
            ) : messages.length <= 1 ? (
              <View style={styles.promptRow}>
                {CONCIERGE_QUICK_ACTIONS.map((action) => (
                  <Pressable key={action.label} style={styles.promptChip} onPress={() => sendMessage(action.prompt)}>
                    <AppText variant="caption">{action.label}</AppText>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <TextField
                  label=""
                  value={input}
                  onChangeText={setInput}
                  placeholder="Type a message..."
                  onSubmitEditing={() => sendMessage(input)}
                  style={{ marginBottom: 0 }}
                />
              </View>
              <Button label="Send" onPress={() => sendMessage(input)} disabled={!input.trim() || loading} style={styles.sendButton} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.gold,
  },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surfaceBlack,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bubbleRow: { marginBottom: spacing.sm, alignItems: 'flex-start' },
  bubbleRowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '82%', padding: spacing.md, borderRadius: radius.md },
  bubbleAssistant: { backgroundColor: colors.onyx, borderWidth: 1, borderColor: colors.border },
  bubbleUser: { backgroundColor: colors.gold },
  promptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  promptChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.lg },
  sendButton: { minHeight: 52, paddingHorizontal: spacing.lg },
});

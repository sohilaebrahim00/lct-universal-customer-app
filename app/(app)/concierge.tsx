import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Button } from '../../src/components/ui/Button';
import { TextField } from '../../src/components/ui/TextField';
import { AppText } from '../../src/components/ui/Typography';
import { colors, radius, spacing } from '../../src/theme/tokens';
import { conciergeApi, type ConciergeMessage } from '../../src/api/concierge';
import { useBookingFormStore } from '../../src/store/bookingFormStore';

const GREETING: ConciergeMessage = {
  role: 'assistant',
  content:
    "Hi, I'm the LCT Universal Concierge. Tell me what you need — e.g. \"Book airport pickup tomorrow at 8 AM for 2 people\" — and I'll get your booking started.",
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

export default function ConciergeScreen() {
  const router = useRouter();
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

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: 'user' as const, content: text }];
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
    <ScreenContainer scroll={false}>
      <AppText variant="display" style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        Concierge
      </AppText>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <Bubble message={item} />}
        contentContainerStyle={{ padding: spacing.lg }}
      />

      {loading ? <ActivityIndicator color={colors.gold} style={{ marginBottom: spacing.sm }} /> : null}

      {readyToBook ? (
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
          <Button label="Continue to Vehicle Selection" onPress={startBookingFromIntent} />
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <View style={{ flex: 1 }}>
          <TextField
            label=""
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            onSubmitEditing={handleSend}
            style={{ marginBottom: 0 }}
          />
        </View>
        <Button label="Send" onPress={handleSend} disabled={!input.trim() || loading} style={styles.sendButton} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { marginBottom: spacing.sm, alignItems: 'flex-start' },
  bubbleRowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '82%', padding: spacing.md, borderRadius: radius.md },
  bubbleAssistant: { backgroundColor: colors.onyx, borderWidth: 1, borderColor: colors.border },
  bubbleUser: { backgroundColor: colors.gold },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  sendButton: { minHeight: 52, paddingHorizontal: spacing.lg },
});

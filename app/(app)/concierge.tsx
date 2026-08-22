import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SendHorizonal } from 'lucide-react-native';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { TextField } from '../../src/components/ui/TextField';
import { AppText } from '../../src/components/ui/Typography';
import { Bubble, TypingBubble } from '../../src/components/concierge/Bubble';
import { IntentCard } from '../../src/components/concierge/IntentCard';
import { gutter, iconSize, iconStroke, radius, space, theme } from '../../src/theme';
import { conciergeApi, type ConciergeMessage } from '../../src/api/concierge';
import { useBookingFormStore } from '../../src/store/bookingFormStore';
import { CONCIERGE_QUICK_ACTIONS } from '../../src/lib/conciergeQuickActions';
import type { ParsedBookingIntent } from '../../src/types/api';

/**
 * CONCIERGE.
 *
 * ── The three things that were wrong ────────────────────────────────────────
 * 1. A failed send became an ASSISTANT message, so a dropped connection read as
 *    the concierge saying "Network request failed". The app's failure wore the
 *    concierge's voice.
 * 2. The typing state was a detached spinner above the input — "the app is
 *    busy", which is a different claim from "the concierge is replying".
 * 3. A parsed intent went straight to vehicle selection, so "tomorrow at 8am"
 *    was acted on without the customer ever seeing how it had been read.
 *
 * All three are the same failure in different clothes: the system doing
 * something on the customer's behalf without showing them what.
 */

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content:
    "Hi, I'm the LCT Universal Concierge — your personal transportation assistant. Tell me what you need — e.g. \"I need transportation from DFW Airport\" — or tap a quick action below.",
  state: 'sent',
};

interface ChatMessage {
  /** Stable across retries, so a resent message keeps its place in the list. */
  id: string;
  role: 'user' | 'assistant';
  content: string;
  state: 'sent' | 'sending' | 'failed';
}

let idCounter = 0;
const nextId = () => `m${++idCounter}`;

export default function ConciergeScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [intent, setIntent] = useState<ParsedBookingIntent | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const updateDraft = useBookingFormStore((s) => s.update);
  const resetDraft = useBookingFormStore((s) => s.reset);

  /** The transcript the API sees: delivered messages only. */
  const transcriptOf = useCallback(
    (list: ChatMessage[]): ConciergeMessage[] =>
      list.filter((m) => m.state === 'sent').map(({ role, content }) => ({ role, content })),
    [],
  );

  const send = useCallback(
    async (message: ChatMessage, transcript: ConciergeMessage[]) => {
      setSending(true);
      setIntent(null);
      try {
        const parsed = await conciergeApi.send([...transcript, { role: 'user', content: message.content }]);
        setMessages((prev) => [
          ...prev.map((m) => (m.id === message.id ? { ...m, state: 'sent' as const } : m)),
          { id: nextId(), role: 'assistant', content: parsed.assistantReply, state: 'sent' as const },
        ]);
        // The card is offered whenever a service type was understood. It is
        // shown even with fields missing, because seeing a partial reading is
        // more useful than seeing nothing — the customer can correct it in the
        // next message rather than discovering it three screens later.
        if (parsed.serviceType) setIntent(parsed);
      } catch {
        /*
         * The failure marks the CUSTOMER'S message, and nothing is appended to
         * the transcript. No assistant bubble, no error text in the concierge's
         * voice — see Bubble.tsx.
         */
        setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, state: 'failed' as const } : m)));
      } finally {
        setSending(false);
      }
    },
    [],
  );

  function handleSend(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    const message: ChatMessage = { id: nextId(), role: 'user', content: text, state: 'sending' };
    const transcript = transcriptOf(messages);
    setMessages((prev) => [...prev, message]);
    setInput('');
    void send(message, transcript);
  }

  /**
   * Retry by id, so the memo on `Bubble` holds.
   *
   * An inline `onRetry={() => handleRetry(item)}` is a new identity on every
   * render, which re-renders every bubble in the transcript on every keystroke
   * in the composer. Taking the id and looking the message up keeps the prop
   * stable across exactly those renders — `messages` does not change while
   * typing.
   */
  const retryById = useCallback(
    (id: string) => {
      if (sending) return;
      const message = messages.find((m) => m.id === id);
      if (!message) return;
      // Same id, so the message keeps its position rather than jumping to the
      // end of a conversation it was part of.
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, state: 'sending' as const } : m)));
      void send(message, transcriptOf(messages.filter((m) => m.id !== id)));
    },
    [sending, messages, send, transcriptOf],
  );

  function startBookingFromIntent() {
    if (!intent) return;
    resetDraft();
    updateDraft({
      serviceType: intent.serviceType ?? 'point_to_point',
      pickupAddress: intent.pickupAddress ?? '',
      dropoffAddress: intent.dropoffAddress ?? '',
      passengerCount: intent.passengerCount ?? 1,
    });
    /*
     * The DATE step, not vehicle selection.
     *
     * `scheduledAtDescription` is a phrase, not an instant, and nothing here
     * resolves it — a client-side guess at "tomorrow" feeding a fare promised
     * as final is the exact silent substitution this redesign removes. The
     * customer sets the time, then the fare is computed against what they set.
     */
    router.push('/(app)/book/details');
  }

  const showQuickActions = messages.length <= 1 && !sending;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      // iOS lifts the whole view; Android's windowSoftInputMode already resizes
      // it, and doubling up leaves a gap the height of the keyboard.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScreenHeader title="Concierge" />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <Bubble role={item.role} content={item.content} state={item.state} id={item.id} onRetryId={retryById} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        /*
         * THE LIST DOES NOT JUMP.
         *
         * Without this, every appended bubble — and every keyboard appearance —
         * shifts the content the customer is reading. `maintainVisibleContentPosition`
         * pins the item at the top of the viewport so new content grows below
         * it instead of pushing it around.
         */
        maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 80 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          <>
            {sending ? <TypingBubble /> : null}
            {intent ? <IntentCard intent={intent} onConfirm={startBookingFromIntent} /> : null}
          </>
        }
      />

      {showQuickActions ? (
        <View style={styles.quickActions}>
          {CONCIERGE_QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [styles.chip, pressed ? styles.chipPressed : null]}
              onPress={() => handleSend(action.prompt)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <AppText variant="caption">{action.label}</AppText>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <View style={styles.field}>
          <TextField
            label=""
            value={input}
            onChangeText={setInput}
            placeholder="Type a message…"
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            containerStyle={styles.fieldContainer}
          />
        </View>
        <Pressable
          onPress={() => handleSend()}
          disabled={!input.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !input.trim() || sending }}
          style={({ pressed }) => [
            styles.send,
            !input.trim() || sending ? styles.sendDisabled : null,
            pressed ? styles.sendPressed : null,
          ]}
        >
          <SendHorizonal
            size={iconSize.md}
            color={!input.trim() || sending ? theme.content.disabled : theme.content.onAccent}
            strokeWidth={iconStroke.interactive}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background.primary },
  list: { paddingHorizontal: gutter, paddingBottom: space.md },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingHorizontal: gutter,
    marginBottom: space.smd,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: theme.border.control,
    paddingHorizontal: space.md,
    // 44 tall, because a chip is a control.
    minHeight: 44,
    justifyContent: 'center',
  },
  chipPressed: { backgroundColor: theme.background.pressedOverlay },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: gutter,
    paddingBottom: space.md,
  },
  field: { flex: 1 },
  fieldContainer: { marginBottom: 0 },
  send: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: theme.content.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { backgroundColor: theme.background.disabled },
  sendPressed: { opacity: 0.85 },
});

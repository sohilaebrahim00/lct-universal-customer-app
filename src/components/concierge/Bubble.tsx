import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { RotateCw } from 'lucide-react-native';
import { AppText } from '../ui/Typography';
import { iconSize, iconStroke, radius, space, theme } from '../../theme';
import { useMotion } from '../../lib/useMotion';

/**
 * ONE BUBBLE, used by every concierge surface.
 *
 * There were two implementations — the full screen's and the floating action
 * button's — which is how two chat UIs in one app come to disagree about
 * padding, corner radius and who is speaking. The FAB is gone; this is what
 * survives it, and it is the only bubble.
 */

export type BubbleState = 'sent' | 'sending' | 'failed';

export interface BubbleProps {
  role: 'user' | 'assistant';
  content: string;
  state?: BubbleState;
  /** Rendered only on a failed user bubble. */
  onRetry?: () => void;
}

export function Bubble({ role, content, state = 'sent', onRetry }: BubbleProps) {
  const isUser = role === 'user';
  const failed = isUser && state === 'failed';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : null]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.user : styles.assistant,
          failed ? styles.failed : null,
          state === 'sending' ? styles.sending : null,
        ]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${isUser ? 'You said' : 'Concierge said'}: ${content}`}
      >
        <AppText variant="body" color={isUser ? theme.content.onAccent : theme.content.primary}>
          {content}
        </AppText>
      </View>

      {/*
        A FAILED SEND IS THE CUSTOMER'S OWN BUBBLE, NOT AN ASSISTANT MESSAGE.

        This used to push `{ role: 'assistant', content: err.message }` into the
        transcript, so a dropped connection appeared as the concierge saying
        "Network request failed" — which reads as the concierge being broken, or
        worse, as a person answering strangely. The app's failure is not the
        concierge's fault and must not wear its voice.

        So the failure attaches to the message that failed, where it belongs,
        and offers the only useful action: send it again.
      */}
      {failed ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={`Message not sent. Retry: ${content}`}
          style={({ pressed }) => [styles.retry, pressed ? styles.retryPressed : null]}
          hitSlop={8}
        >
          <RotateCw size={iconSize.sm} color={theme.content.danger} strokeWidth={iconStroke.interactive} />
          <AppText variant="captionSm" color={theme.content.danger} style={styles.retryLabel}>
            Not sent · Tap to retry
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * The typing indicator, INSIDE a bubble.
 *
 * It was a detached `ActivityIndicator` floating above the input, which says
 * "the app is busy" — a different claim from "the concierge is composing a
 * reply". Putting it in a bubble in the assistant's position says the second
 * thing, and it also holds the space the reply will occupy, so the list does
 * not jump when the text arrives.
 *
 * Announced once, politely, rather than on every dot.
 */
export function TypingBubble() {
  const motion = useMotion();

  return (
    <View style={styles.row}>
      <View
        style={[styles.bubble, styles.assistant, styles.typing]}
        accessibilityLiveRegion="polite"
        accessibilityLabel="Concierge is typing"
      >
        {[0, 1, 2].map((i) => (
          <Dot key={i} index={i} reduced={motion.reduced} />
        ))}
      </View>
    </View>
  );
}

function Dot({ index, reduced }: { index: number; reduced: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    progress.value = withDelay(
      index * 160,
      withRepeat(withTiming(1, { duration: 560, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [index, progress, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: reduced ? 0.6 : 0.35 + progress.value * 0.5,
    transform: [{ translateY: reduced ? 0 : -progress.value * 3 }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  row: { marginBottom: space.smd, alignItems: 'flex-start' },
  rowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '82%', paddingHorizontal: space.md, paddingVertical: space.smd, borderRadius: radius.xl },
  assistant: {
    backgroundColor: theme.background.secondary,
    borderWidth: 1,
    borderColor: theme.border.hairline,
    // Squared on the side it speaks from — the tail, without drawing one.
    borderBottomStartRadius: radius.sm,
  },
  user: { backgroundColor: theme.content.accent, borderBottomEndRadius: radius.sm },
  /** In flight: still the customer's words, just not yet delivered. */
  sending: { opacity: 0.6 },
  failed: { borderWidth: 1, borderColor: theme.border.danger },
  retry: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs, minHeight: 44 },
  retryPressed: { opacity: 0.7 },
  retryLabel: {},
  typing: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: space.md },
  dot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: theme.content.secondary },
});

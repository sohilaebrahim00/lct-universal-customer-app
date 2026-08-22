import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AlertTriangle, Check, Info } from 'lucide-react-native';
import { AppText } from './Typography';
import { elevation, gutter, iconSize, iconStroke, radius, space, theme, transition } from '../../theme';
import { useMotion } from '../../lib/useMotion';

export type ToastTone = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  text: string;
  tone: ToastTone;
}

interface ToastApi {
  /** Shows a transient message. Returns immediately; the host owns dismissal. */
  show: (text: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const VISIBLE_MS = 3200;

const TONE_ICON = { success: Check, error: AlertTriangle, info: Info } as const;
const TONE_COLOR: Record<ToastTone, string> = {
  success: theme.content.success,
  error: theme.content.danger,
  info: theme.content.accentEmphasis,
};

/**
 * Transient confirmation and failure messages.
 *
 * Exists mainly for slice 12's optimistic UI: cancel-trip and add-saved-location
 * apply immediately and roll back on failure, and a rollback that happens
 * silently is worse than no optimism at all — the user sees their action undo
 * itself with no explanation. The toast is the explanation.
 *
 * Not for errors that block progress. Those get a designed error state on the
 * screen itself, because a message that disappears after three seconds is the
 * wrong container for something the user has to act on.
 *
 * `accessibilityLiveRegion="assertive"` here, unlike ConnectivityBanner's
 * polite: a toast is short-lived, so if it does not interrupt it is never heard.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const show = useCallback((text: string, tone: ToastTone = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    nextId.current += 1;
    setMessage({ id: nextId.current, text, tone });
    timer.current = setTimeout(() => setMessage(null), VISIBLE_MS);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {message ? <ToastHost key={message.id} message={message} /> : null}
    </ToastContext.Provider>
  );
}

/** Throws rather than no-oping if the provider is missing — a silently swallowed toast is a bug that hides itself. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside a <ToastProvider>');
  return api;
}

function ToastHost({ message }: { message: ToastMessage }) {
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const progress = useSharedValue(0);
  const Icon = TONE_ICON[message.tone];

  useEffect(() => {
    progress.value = withTiming(1, motion.reduced ? transition.reducedFade : transition.enter);
  }, [motion.reduced, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: motion.reduced ? [] : [{ translateY: (1 - progress.value) * 12 }],
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.host, { bottom: insets.bottom + space.xxl }, animatedStyle]}
    >
      <View
        style={styles.toast}
        accessibilityLiveRegion="assertive"
        accessible
        accessibilityRole="alert"
        accessibilityLabel={message.text}
      >
        <Icon size={iconSize.sm} color={TONE_COLOR[message.tone]} strokeWidth={iconStroke.interactive} />
        <AppText variant="caption" color={theme.content.primary} style={styles.text} numberOfLines={2}>
          {message.text}
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: gutter, right: gutter, alignItems: 'center' },
  toast: {
    ...elevation.sheet,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border.hairlineStrong,
    borderRadius: radius.md,
    paddingVertical: space.smd,
    paddingHorizontal: 14,
    maxWidth: '100%',
  },
  text: { flex: 1, marginStart: space.sm },
});

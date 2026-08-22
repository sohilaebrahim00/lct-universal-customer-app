import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Haptics, guarded.
 *
 * `expo-haptics` maps to `navigator.vibrate` on web, and Chrome refuses the
 * call — logging a console error — until the frame has received a user gesture.
 * A screen opened from a deep link therefore prints an error the client can see
 * in devtools, for a buzz that most laptops cannot produce anyway.
 *
 * So haptics are native-only. Every rejection is also swallowed: a decorative
 * signal must never become a visible failure. iOS additionally drops haptics in
 * Low Power Mode, with the camera active, or during dictation, so a caller can
 * never assume one fired.
 *
 * The vocabulary is deliberately narrow — three signals, and never anything
 * else. Apps that feel cheap either buzz at everything or at nothing.
 */
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

/** Browsing: a choice was registered — a vehicle, a chip, a segment. */
export function hapticSelection(): void {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
}

/** Commit: a sheet snapped, a step was confirmed. */
export function hapticImpact(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {});
}

/** The single moment of confirmation. Reserved for booking confirmed. */
export function hapticSuccess(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

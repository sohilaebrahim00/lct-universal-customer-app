import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'lct-universal:guest-mode';

/**
 * Persisted across app restarts so choosing "Continue as Guest" once
 * doesn't re-prompt the welcome screen every launch — matches the
 * "premium app" expectation that guest browsing sticks the same way a
 * real session would. Cleared on real sign-in (see authStore.ts); set
 * again on sign-out so leaving an account returns to guest browsing
 * rather than a forced welcome screen.
 */
export async function isGuestMode(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === 'true';
}

export async function setGuestMode(value: boolean): Promise<void> {
  if (value) await AsyncStorage.setItem(KEY, 'true');
  else await AsyncStorage.removeItem(KEY);
}

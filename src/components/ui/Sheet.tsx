import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './Typography';
import { elevation, elevationRadius, radius, space, theme } from '../../theme';

/**
 * ROUTE-LEVEL SHEETS.
 *
 * The decision on record is native sheets first, and they cost nothing: the
 * installed `react-native-screens@4.26.0` already exposes `sheetAllowedDetents`,
 * `sheetInitialDetentIndex`, `sheetLargestUndimmedDetentIndex` and
 * `sheetGrabberVisible` — verified in its shipped typings, not assumed. So a
 * sheet that is a route gets real OS detents, real scrim behaviour and no JS
 * running during the drag, with no new dependency.
 *
 * `BottomSheet` (sibling file) stays for sheets that are not routes.
 */

export interface SheetOptions {
  /** Ascending fractions of the screen. Android permits at most 3. */
  detents?: number[];
  /** Which detent opens first, indexed into `detents`. */
  initialDetentIndex?: number;
  /**
   * THE important decision, and it should be deliberate rather than default.
   *
   * At or below this index the sheet is NOT dimmed and the content behind stays
   * interactive — which is what makes a map picker work, because the whole point
   * is to keep dragging the map with the sheet open. Above it, the sheet is
   * modal.
   *
   * `'none'` means every detent dims. Pass an index to make the low detent
   * non-modal.
   */
  largestUndimmedDetentIndex?: number | 'none';
  grabberVisible?: boolean;
}

/**
 * Screen options for a route presented as a native bottom sheet.
 *
 *   <Stack.Screen name="pickup" options={sheetScreenOptions({
 *     detents: [0.3, 0.6, 0.95],
 *     largestUndimmedDetentIndex: 0,
 *   })} />
 */
export function sheetScreenOptions(options: SheetOptions = {}) {
  const {
    detents = [0.3, 0.6, 0.95],
    initialDetentIndex = 0,
    largestUndimmedDetentIndex = 'none',
    grabberVisible = true,
  } = options;

  return {
    presentation: 'formSheet' as const,
    sheetAllowedDetents: detents,
    sheetInitialDetentIndex: initialDetentIndex,
    sheetLargestUndimmedDetentIndex: largestUndimmedDetentIndex,
    sheetGrabberVisible: grabberVisible,
    sheetCornerRadius: elevationRadius.sheet,
    sheetExpandsWhenScrolledToEdge: true,
    contentStyle: { backgroundColor: theme.background.tertiary },
    headerShown: false,
  };
}

interface SheetProps {
  children: ReactNode;
  title?: string;
  /** Draws the grabber. Off when the OS is already drawing one for a route sheet. */
  grabber?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The sheet's own chrome — fill, corners, grabber, safe-area padding — so a
 * route sheet and an in-place sheet look identical from the inside.
 */
export function Sheet({ children, title, grabber = false, style }: SheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }, style]}>
      {grabber ? (
        <View style={styles.grabberHit}>
          <View style={styles.grabber} />
        </View>
      ) : null}
      {title ? (
        <AppText variant="title" accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    ...elevation.sheet,
    flex: 1,
    borderTopLeftRadius: elevationRadius.sheet,
    borderTopRightRadius: elevationRadius.sheet,
    paddingHorizontal: space.mdl,
    paddingTop: space.sm,
  },
  grabberHit: { height: 44, alignItems: 'center', justifyContent: 'center' },
  grabber: { width: 40, height: 4, borderRadius: radius.full, backgroundColor: theme.misc.handle },
  title: { marginBottom: space.md },
});

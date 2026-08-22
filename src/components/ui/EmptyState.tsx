import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './Typography';
import { iconSize, iconStroke, radius, space, theme } from '../../theme';

interface Props {
  icon: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * "You have nothing here yet" — and ONLY that.
 *
 * Empty is not failed and is not offline. The app used to collapse all three:
 * a 500 from `GET /bookings` rendered "No upcoming trips", which told a customer
 * with a car arriving in twenty minutes that they had none (audit P0-5). Empty
 * is the one state where nothing has gone wrong, so it is the only one that gets
 * this calm, unalarmed treatment. `ErrorState` is its sibling.
 *
 * The headline is serif: an empty state is one of the four places the display
 * face is allowed to carry content rather than structure.
 */
export function EmptyState({ icon: Icon, title, message, action, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconWrap}>
        <Icon size={iconSize.lg} color={theme.content.tertiary} strokeWidth={iconStroke.decorative} />
      </View>
      <AppText variant="heading" center style={styles.title}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color={theme.content.secondary} center style={styles.message}>
          {message}
        </AppText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: space.xl, paddingHorizontal: space.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: theme.background.tertiary,
    borderWidth: 1,
    borderColor: theme.border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  title: { marginBottom: space.sm },
  message: { maxWidth: 280 },
  action: { marginTop: space.md, alignSelf: 'stretch' },
});

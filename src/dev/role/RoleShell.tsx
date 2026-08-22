import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { space } from '../../theme/ref';
import { roleColor, roleLayout, roleTarget, roleText } from './roleTheme';

/**
 * The frame every role-preview screen sits in.
 *
 * Its job is the label. Each screen states, permanently and on screen, that it
 * is a preview of a product that does not exist — because the failure mode of a
 * convincing preview is a client who leaves the room believing the driver app
 * is nearly finished. One quiet line under the title, present on all five
 * screens, never dismissible.
 *
 * Not a banner: a banner that dominates the screen would make the preview
 * useless for judging the actual design, which is what it is for.
 */

interface Props {
  title: string;
  /** The one-line disclosure. Written per screen so it names that screen's product. */
  note: string;
  onBack?: () => void;
  /** Rendered outside the scroll view, pinned to the bottom. */
  footer?: ReactNode;
  children: ReactNode;
}

export function RoleShell({ title, note, onBack, footer, children }: Props) {
  const router = useRouter();

  return (
    <View style={roleLayout.screen}>
      <ScrollView
        // The footer is pinned OVER the scroll view, so the content needs room
        // to clear it — without this the last field sat underneath the Call and
        // Message buttons and could not be scrolled into view.
        contentContainerStyle={[roleLayout.scroll, footer ? styles.scrollWithFooter : null]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={onBack ?? (() => router.back())}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}
        >
          <Text style={roleText.bodySoft}>← Back</Text>
        </Pressable>

        <Text style={[roleText.title, styles.title]} accessibilityRole="header">
          {title}
        </Text>
        <Text style={[roleText.bodySoft, styles.note]}>{note}</Text>

        {children}
      </ScrollView>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  // Clears the tallest pinned footer (72pt action + its padding) with room over.
  scrollWithFooter: { paddingBottom: 132 },
  back: { minHeight: roleTarget.min, justifyContent: 'center' },
  title: { marginTop: space.sm },
  note: {
    marginTop: space.sm,
    marginBottom: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: roleColor.hairline,
  },
});

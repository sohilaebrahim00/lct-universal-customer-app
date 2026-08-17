import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './ui/Typography';
import { colors, radius, spacing } from '../theme/tokens';

const REVIEWS = [
  { name: 'James R.', rating: 5, quote: 'Exceptional service from pickup to destination. Will book again for every trip.' },
  { name: 'Amara T.', rating: 5, quote: 'Professional chauffeur, beautiful vehicle, perfect experience for our corporate event.' },
  { name: 'David K.', rating: 5, quote: 'Flight was delayed and they tracked it — driver was waiting when we landed. Seamless.' },
  { name: 'Sophia L.', rating: 5, quote: 'Booked a Sprinter for a wedding party. On time, spotless, and the driver was fantastic.' },
];

function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons key={i} name={i < rating ? 'star' : 'star-outline'} size={14} color={colors.gold} />
      ))}
    </View>
  );
}

export function ReviewsSection() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}>
      {REVIEWS.map((review) => (
        <View key={review.name} style={styles.card}>
          <Stars rating={review.rating} />
          <AppText variant="body" style={{ marginBottom: spacing.md }}>
            &ldquo;{review.quote}&rdquo;
          </AppText>
          <AppText variant="caption" color={colors.gold}>
            {review.name}
          </AppText>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 260,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.onyx,
    padding: spacing.lg,
  },
});

import { Image, StyleSheet, View } from 'react-native';
import { spacing } from '../theme/tokens';
import { AppText } from './ui/Typography';
import { Divider } from './ui/Divider';

export function AuthBrandHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <View style={styles.wrapper}>
      <Image
        source={require('../../assets/brand/lct-logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="LCT Universal Executive Transports"
      />
      <AppText variant="eyebrow" center>
        {eyebrow}
      </AppText>
      <AppText variant="title" center style={styles.title}>
        {title}
      </AppText>
      <Divider style={styles.divider} />
      <AppText variant="bodyMuted" center>
        {subtitle}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { width: 120, height: 80, marginBottom: spacing.md },
  title: { marginTop: spacing.xs },
  divider: { width: 64 },
});

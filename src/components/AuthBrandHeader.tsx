import { Image, StyleSheet, View } from 'react-native';
import { space } from '../theme';
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
  wrapper: { alignItems: 'center', marginBottom: space.xl },
  logo: { width: 120, height: 80, marginBottom: space.md },
  title: { marginTop: space.xs },
  divider: { width: 64 },
});

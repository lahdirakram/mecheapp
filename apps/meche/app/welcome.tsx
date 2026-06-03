import { View } from 'react-native';
import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthLoading, useSession } from '@meche/api-client';
import { MPAL, MText, MWordmark, PrimaryButton, useT } from '@meche/ui';

// Onboarding 01 · Welcome — 2×2 collage of the SAME person wearing four different AI hairstyles
// (illustrating "vois la coupe avant la coupe"), with a bottom fade, then small wordmark + · BÊTA,
// a serif-46 "Sois de la mèche." headline, an ink primary, and a quiet "J'ai déjà un compte".
const ACCENT = MPAL.ink;

// One face, four cuts — generated with the app's own try-on pipeline.
const LOOKS = [
  require('../assets/onboarding/1.jpg'),
  require('../assets/onboarding/2.jpg'),
  require('../assets/onboarding/3.jpg'),
  require('../assets/onboarding/4.jpg'),
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const session = useSession();
  const loading = useAuthLoading();
  const go = () => router.push('/(auth)/choice');
  const login = () => router.push('/(auth)/signin');

  // Already signed in (e.g. arrived here via browser back)? Bounce into the app.
  if (!loading && session) return <Redirect href="/(tabs)/explore" />;

  const cell = { flex: 1, borderRadius: 24, overflow: 'hidden' as const };

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg }}>
      {/* portrait collage */}
      <View style={{ flex: 1, overflow: 'hidden', paddingTop: insets.top + 16, paddingHorizontal: 18 }}>
        {/* Two rows that flex to fill the collage area → scales to any screen height without
            clipping the bottom row (short screens) or leaving a gap (tall/wide screens). */}
        <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
          <View style={cell}>
            <Image source={LOOKS[0]} style={{ flex: 1 }} contentFit="cover" contentPosition="top" transition={250} />
          </View>
          <View style={cell}>
            <Image source={LOOKS[1]} style={{ flex: 1 }} contentFit="cover" contentPosition="top" transition={250} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, flex: 1, marginTop: 10 }}>
          <View style={cell}>
            <Image source={LOOKS[2]} style={{ flex: 1 }} contentFit="cover" contentPosition="top" transition={250} />
          </View>
          <View style={cell}>
            <Image source={LOOKS[3]} style={{ flex: 1 }} contentFit="cover" contentPosition="top" transition={250} />
          </View>
        </View>
        <LinearGradient
          colors={['rgba(252,248,244,0)', MPAL.bg]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 }}
          pointerEvents="none"
        />
      </View>

      {/* copy + CTAs */}
      <View style={{ paddingHorizontal: 26, paddingTop: 18, paddingBottom: insets.bottom + 24, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MWordmark size={20} />
          <MText variant="mono" size={10} color={ACCENT} style={{ letterSpacing: 1.8 }}>
            · BÊTA
          </MText>
        </View>

        <MText variant="serif" size={46} style={{ lineHeight: 46, letterSpacing: -0.035 * 46 }}>
          Sois de la <MText variant="serifItalic" size={46} color={ACCENT}>mèche</MText>.
        </MText>

        <MText variant="body" size={15} color={MPAL.mute} style={{ lineHeight: 22, maxWidth: 320 }}>
          {t('sub1')}
        </MText>

        <View style={{ marginTop: 14, gap: 10 }}>
          <PrimaryButton label={t('cta_start')} tone="ink" icon="arrowRight" onPress={go} />
          <MText variant="bodyMedium" size={14} color={MPAL.mute} onPress={login} style={{ textAlign: 'center', paddingVertical: 4 }}>
            {t('cta_login')}
          </MText>
        </View>
      </View>
    </View>
  );
}

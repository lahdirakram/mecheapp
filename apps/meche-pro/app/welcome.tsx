import { Pressable, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthLoading, useSession } from '@meche/api-client';
import { MPAL, MText, PWordmark, PrimaryButton, useLang } from '@meche/ui';

// Onboarding · Welcome Pro. Positioning: show the cut before the cut, at the chair.
export default function WelcomePro() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lang = useLang();
  const session = useSession();
  const loading = useAuthLoading();

  // Already signed in (e.g. arrived here via back)? Bounce into the app.
  if (!loading && session) return <Redirect href="/(tabs)/studio" />;

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 16 }}>
        <PWordmark size={48} />
        <MText variant="mono" size={10} color={MPAL.ink} style={{ letterSpacing: 1.8 }}>
          · BÊTA
        </MText>
        <MText variant="serif" size={34} style={{ textAlign: 'center', lineHeight: 38 }}>
          {lang === 'fr' ? 'Montre la coupe ' : 'Show the cut '}
          <MText variant="serifItalic" size={34}>
            {lang === 'fr' ? 'avant' : 'before'}
          </MText>
          {lang === 'fr' ? ' la coupe.' : ' the cut.'}
        </MText>
        <MText variant="body" size={15} color={MPAL.ink2} style={{ textAlign: 'center', lineHeight: 22, maxWidth: 300 }}>
          {lang === 'fr'
            ? 'Fais essayer la coiffure à ta cliente au fauteuil, en 20 secondes, et coupe en confiance.'
            : 'Let your client try the style at the chair, in 20 seconds, and cut with confidence.'}
        </MText>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}>
        <PrimaryButton
          label={lang === 'fr' ? 'Créer mon salon' : 'Create my salon'}
          tone="ink"
          icon="arrowRight"
          onPress={() => router.push('/(auth)/signup')}
        />
        <Pressable hitSlop={12} onPress={() => router.push('/(auth)/signin')}>
          <MText variant="bodyMedium" size={14} color={MPAL.mute} style={{ textAlign: 'center', paddingVertical: 4 }}>
            {lang === 'fr' ? "J'ai déjà un compte" : 'I already have an account'}
          </MText>
        </Pressable>
      </View>
    </View>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MIcon, MPAL, MText, TopBar, useLang, useT, useToast } from '@meche/ui';
import { supabase } from '../../lib/supabase';
import { useTryStore } from '../../lib/tryStore';

type Suggestion = { name: string; description: string; reasons: string[]; prompt: string };

// Client-side last resort so the screen is never empty if the call fails.
const FALLBACK = (lang: 'fr' | 'en'): Suggestion => ({
  name: lang === 'fr' ? 'Carré flou caramel' : 'Soft caramel bob',
  description: lang === 'fr' ? 'Un carré effilé qui adoucit les traits et capte la lumière.' : 'A wispy bob that softens the features and catches the light.',
  reasons: lang === 'fr' ? ['Visage ovale', 'Effet volume', 'Entretien facile'] : ['Oval face', 'Adds volume', 'Low upkeep'],
  prompt: 'a soft, textured chin-length bob with caramel balayage and wispy ends',
});

// B2C · L'IA te propose (07) — an LLM reads the selfie and proposes ONE cut as TEXT. The user
// reads the suggestion (no photo here); on "Essayer ça" we run the real image generation.
export default function AIPropose() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const { selfieBase64, mimeType, setBrief } = useTryStore();
  const [loading, setLoading] = useState(true);
  const [sug, setSug] = useState<Suggestion | null>(null);
  const excludeRef = useRef<string[]>([]);
  const pulse = useRef(new Animated.Value(1)).current;

  const fetchSuggestion = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest', {
        body: { selfieBase64, mimeType, lang, exclude: excludeRef.current },
      });
      if (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const status: number | undefined = (error as any)?.context?.status;
        if (status === 503) toast(lang === 'fr' ? 'IA occupée, réessaie dans un instant.' : 'AI busy, try again shortly.');
        setSug(FALLBACK(lang));
      } else {
        const s = data as Suggestion;
        setSug(s);
        if (s?.name) excludeRef.current = [...excludeRef.current, s.name].slice(-6);
      }
    } catch {
      setSug(FALLBACK(lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSuggestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const accept = () => {
    if (!sug) return;
    setBrief({ prompt: sug.prompt, lookName: sug.name });
    router.push('/try/generating');
  };

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top }}>
      <TopBar onBack={() => router.back()} />

      <View style={{ paddingHorizontal: 22, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <MIcon name="sparkle" size={14} color={MPAL.ink} />
          <MText variant="mono" size={10} color={MPAL.ink} style={{ letterSpacing: 1.8 }}>
            {t('path_ai').toUpperCase()}
          </MText>
        </View>
        {!loading && sug ? (
          <MText variant="serif" size={30} style={{ lineHeight: 32 }}>
            {lang === 'fr' ? 'Pour toi : ' : 'For you: '}
            <MText variant="serifItalic" size={30}>{sug.name}</MText>.
          </MText>
        ) : (
          <MText variant="serif" size={30} color={MPAL.mute} style={{ lineHeight: 32 }}>
            {lang === 'fr' ? 'Mèche réfléchit…' : 'Mèche is thinking…'}
          </MText>
        )}
      </View>

      {loading || !sug ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 30, paddingBottom: 60 }}>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: MPAL.sable, alignItems: 'center', justifyContent: 'center', shadowColor: MPAL.sable, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}>
              <MIcon name="sparkle" size={34} color="#fff" fill="#fff" stroke={0} />
            </View>
          </Animated.View>
          <MText variant="serif" size={24} style={{ textAlign: 'center' }}>
            {lang === 'fr' ? 'Mèche analyse ton visage…' : 'Mèche is reading your face…'}
          </MText>
          <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.4 }}>
            {lang === 'fr' ? 'ANALYSE DE TON STYLE' : 'ANALYSING YOUR STYLE'}
          </MText>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 18 }} showsVerticalScrollIndicator={false}>
            {/* the textual proposition — no photo, the image only exists after the user accepts */}
            <View style={{ padding: 18, borderRadius: 20, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: MPAL.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <MIcon name="sparkle" size={15} color="#fff" fill="#fff" stroke={0} />
                </View>
                <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.4 }}>
                  {lang === 'fr' ? 'LA PROPOSITION DE MÈCHE' : "MÈCHE'S SUGGESTION"}
                </MText>
              </View>
              <MText variant="serif" size={22} style={{ lineHeight: 26, marginBottom: 8 }}>
                {sug.name}
              </MText>
              <MText size={15} color={MPAL.ink} style={{ lineHeight: 22 }}>
                {sug.description}
              </MText>
            </View>

            {/* why this */}
            {sug.reasons.length > 0 ? (
              <>
                <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.4, marginBottom: 8 }}>
                  {t('why_this').toUpperCase()}
                </MText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {sug.reasons.map((r, i) => (
                    <View key={i} style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border }}>
                      <MText variant="bodyMedium" size={12} color={MPAL.ink}>
                        {r}
                      </MText>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <MText size={12} color={MPAL.mute} style={{ marginTop: 10, lineHeight: 17 }}>
              {lang === 'fr'
                ? 'On générera l’aperçu sur ta photo seulement si tu valides. Ça utilise 1 crédit.'
                : 'We’ll render the preview on your photo only if you accept. It uses 1 credit.'}
            </MText>
          </ScrollView>

          {/* actions */}
          <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: insets.bottom + 16 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => void fetchSuggestion()} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: MPAL.border }}>
                <MIcon name="sparkle" size={14} color={MPAL.ink} />
                <MText variant="bodySemibold" size={14} color={MPAL.ink}>
                  {t('another_suggestion')}
                </MText>
              </Pressable>
              <Pressable onPress={accept} style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 999, backgroundColor: MPAL.ink }}>
                <MText variant="bodySemibold" size={14} color="#fff">
                  {t('accept_suggestion')}
                </MText>
                <MIcon name="arrowRight" size={14} color="#fff" />
              </Pressable>
            </View>
            {/* back to the prompt screen to write the cut yourself */}
            <Pressable onPress={() => router.replace('/try/idea')} style={{ alignSelf: 'center', marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12 }}>
              <MIcon name="chevronLeft" size={14} color={MPAL.mute} />
              <MText variant="bodySemibold" size={13} color={MPAL.mute}>
                {lang === 'fr' ? 'Plutôt écrire mon idée' : 'Describe it myself instead'}
              </MText>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

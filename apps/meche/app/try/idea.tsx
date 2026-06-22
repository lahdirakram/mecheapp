import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCredits, useSession } from '@meche/api-client';
import { FONTS, MIcon, MPAL, MText, PrimaryButton, pOnDark, useLang, useT, useToast } from '@meche/ui';
import { supabase } from '../../lib/supabase';
import { useTryStore } from '../../lib/tryStore';

// B2C · Ton idée — prompt-first intent screen after the selfie. The prompt is the hero; "L'IA te
// propose" no longer opens a separate screen — it asks Mèche for a cut and FILLS this editor (bold
// title + plain description), which the user can then tweak before generating.
const ACCENT = MPAL.ink;
const ON_DARK = pOnDark(ACCENT); // caramel on the dark AI card

type Suggestion = { name: string; description: string; reasons: string[]; prompt: string };

// Client-side last resort so the editor is never left empty if the call fails.
const FALLBACK = (lang: 'fr' | 'en'): Suggestion => ({
  name: lang === 'fr' ? 'Carré flou caramel' : 'Soft caramel bob',
  description: lang === 'fr' ? 'Un carré effilé qui adoucit les traits et capte la lumière.' : 'A wispy bob that softens the features and catches the light.',
  reasons: [],
  prompt: 'a soft, textured chin-length bob with caramel balayage and wispy ends',
});

export default function Idea() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const session = useSession();
  const { data: credits } = useCredits(session?.user.id);
  const { selfieBase64, mimeType, setBrief, surprise, setSurprise } = useTryStore();

  const [prompt, setPrompt] = useState('');
  // Length of the bold "title" prefix at the start of the editor (0 = no bold span). Set when a
  // suggestion fills the field; kept while the title text stays intact, dropped once it's edited.
  const [boldLen, setBoldLen] = useState(0);
  const [suggesting, setSuggesting] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  // Pulse the loader while Mèche is thinking (only while the blocking overlay is up).
  useEffect(() => {
    if (!suggesting) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [suggesting, pulse]);
  // The last suggestion that filled the editor. We keep the model's high-quality ENGLISH prompt so an
  // *unedited* suggestion generates from it (better than the localized text the user is reading).
  const sugRef = useRef<{ name: string; enPrompt: string; filledText: string } | null>(null);
  const excludeRef = useRef<string[]>([]);

  const examples = lang === 'fr' ? ['Wolf cut châtain', 'Carré flou caramel', 'Pixie audacieux', 'Boucles définies', 'Reflets miel doux'] : ['Ash-brown wolf cut', 'Caramel soft bob', 'Bold pixie', 'Defined curls', 'Soft honey highlights'];
  const canGenerate = prompt.trim().length > 0;

  const onChange = (text: string) => {
    setPrompt(text);
    // Keep the title bold only while its exact prefix is still there; any edit to it clears the span.
    const name = sugRef.current?.name;
    setBoldLen(name && text.startsWith(name) ? name.length : 0);
  };

  const pickExample = (e: string) => {
    sugRef.current = null;
    setBoldLen(0);
    setPrompt(e);
  };

  // Ask Mèche for ONE cut (free text endpoint) and pour it into the editor: title on the first line
  // (bold), description below. Tapping again rolls a different one (exclude list avoids repeats).
  const doSuggest = async () => {
    if (suggesting) return;
    setSuggesting(true);
    try {
      let s: Suggestion;
      const { data, error } = await supabase.functions.invoke('suggest', { body: { selfieBase64, mimeType, lang, exclude: excludeRef.current } });
      if (error || !(data as Suggestion)?.name) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any)?.context?.status === 429) toast(lang === 'fr' ? 'Trop de demandes, réessaie dans un instant.' : 'Too many requests, try again shortly.');
        s = FALLBACK(lang);
      } else {
        s = data as Suggestion;
      }
      excludeRef.current = [...excludeRef.current, s.name].slice(-6);
      const filled = `${s.name}\n${s.description}`;
      sugRef.current = { name: s.name, enPrompt: s.prompt, filledText: filled };
      setBoldLen(s.name.length);
      setPrompt(filled);
    } catch {
      const s = FALLBACK(lang);
      const filled = `${s.name}\n${s.description}`;
      sugRef.current = { name: s.name, enPrompt: s.prompt, filledText: filled };
      setBoldLen(s.name.length);
      setPrompt(filled);
    } finally {
      setSuggesting(false);
    }
  };

  // "Coupe surprise" entry (from the selfie screen) lands here and auto-asks Mèche to fill the field.
  useEffect(() => {
    if (surprise) {
      setSurprise(false);
      void doSuggest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGenerate = () => {
    const text = prompt.trim();
    if (!text) return;
    const s = sugRef.current;
    if (s && prompt === s.filledText) {
      // Untouched suggestion → generate from the model's English prompt, keep the pretty name.
      setBrief({ prompt: s.enPrompt, lookName: s.name });
    } else {
      // The user wrote or tweaked it → use their text; the first line names the look.
      setBrief({ prompt: text, lookName: text.split('\n')[0].slice(0, 40) });
    }
    router.push('/try/generating');
  };

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top + 6 }}>
      {/* chrome */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
          <MIcon name="chevronLeft" size={18} />
        </Pressable>
        <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.6 }}>
          {lang === 'fr' ? 'ÉTAPE 2 · TON IDÉE' : 'STEP 2 · YOUR IDEA'}
        </MText>
        <Pressable hitSlop={8} onPress={() => router.dismissAll()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
          <MIcon name="x" size={18} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <MText variant="serif" size={32} style={{ marginTop: 8, lineHeight: 34 }}>
          {lang === 'fr' ? 'Décris la coupe que tu veux.' : 'Describe the cut you want.'}
        </MText>

        {/* prompt hero — rich editor: bold title span + plain body */}
        <View style={{ marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border }}>
          <TextInput
            onChangeText={onChange}
            placeholder={t('prompt_placeholder')}
            placeholderTextColor={MPAL.mute}
            multiline
            scrollEnabled
            maxLength={240}
            // Auto-grows with the content (no fixed height), capped so it never reaches the bottom CTA;
            // past the cap it scrolls internally. minHeight/maxHeight is reliable with the rich children.
            style={{ minHeight: 84, maxHeight: 200, fontFamily: FONTS.serif, fontSize: 18, color: MPAL.ink, lineHeight: 25 }}
          >
            {/* When children are present, they ARE the value — render the bold/plain split. Empty
                children let the placeholder show. */}
            {prompt.length > 0 ? (
              <Text>
                {boldLen > 0 ? <Text style={{ fontFamily: FONTS.serifSemibold }}>{prompt.slice(0, boldLen)}</Text> : null}
                <Text>{prompt.slice(boldLen)}</Text>
              </Text>
            ) : null}
          </TextInput>
          {/* Counter stays hidden until 70% to avoid stressing the user, then warns near the cap. */}
          {prompt.length >= 168 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 }}>
              <MText variant="mono" size={10} color={prompt.length >= 216 ? MPAL.sable : MPAL.mute}>
                {prompt.length}/240
              </MText>
            </View>
          ) : null}
        </View>

        {/* example chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 12 }} contentContainerStyle={{ gap: 8, alignItems: 'flex-start' }}>
          {examples.map((e, i) => (
            <Pressable key={i} onPress={() => pickExample(e)} style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border }}>
              <MText variant="serifItalic" size={12} color={MPAL.ink}>
                {e}
              </MText>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>

      {/* generate + alternatives */}
      <LinearGradient colors={['rgba(252,248,244,0)', MPAL.bg]} style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 14, gap: 12 }}>
        <PrimaryButton label={t('generate')} tone="caramel" icon="sparkle" disabled={!canGenerate} onPress={onGenerate} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -4 }}>
          <MIcon name="coin" size={11} color={MPAL.mute} />
          <MText size={11} color={MPAL.mute}>
            {lang === 'fr' ? `Utilise 1 crédit · ${credits ?? 0} restants` : `Uses 1 credit · ${credits ?? 0} left`}
          </MText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: MPAL.border }} />
          <MText variant="mono" size={10} color={MPAL.mute}>
            {t('auth_or').toUpperCase()}
          </MText>
          <View style={{ flex: 1, height: 1, backgroundColor: MPAL.border }} />
        </View>

        {/* AI proposes — fills the editor above instead of opening a screen */}
        <Pressable onPress={doSuggest} disabled={suggesting} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, backgroundColor: MPAL.ink, overflow: 'hidden', opacity: suggesting ? 0.85 : 1 }}>
          <View style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: `${ON_DARK}33` }} />
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: ON_DARK, alignItems: 'center', justifyContent: 'center' }}>
            {suggesting ? <ActivityIndicator color="#fff" /> : <MIcon name="sparkle" size={22} color="#fff" fill="#fff" stroke={0} />}
          </View>
          <View style={{ flex: 1 }}>
            <MText variant="serif" size={18} color="#fff">
              {suggesting ? t('ai_thinking') : t('path_ai')}
            </MText>
            <MText size={12} color="rgba(255,255,255,0.7)" style={{ marginTop: 1 }}>
              {sugRef.current
                ? lang === 'fr'
                  ? 'Touche pour une autre idée.'
                  : 'Tap for another idea.'
                : lang === 'fr'
                  ? "Pas d'idée ? Mèche écrit pour toi."
                  : 'No idea? Mèche writes it for you.'}
            </MText>
          </View>
          <MIcon name={sugRef.current ? 'arrowUp' : 'arrowRight'} size={18} color={ON_DARK} />
        </Pressable>
      </LinearGradient>

      {/* Blocking loader while Mèche thinks — covers the screen so the prompt can't be touched
          mid-fill (also shown on the auto-trigger from "coupe surprise"). */}
      {suggesting ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: MPAL.bg, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 30 }}>
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
      ) : null}
    </View>
  );
}

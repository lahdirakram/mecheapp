import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCredits, useSession } from '@meche/api-client';
import { FONTS, MIcon, MPAL, MText, PrimaryButton, pOnDark, useLang, useT, useToast } from '@meche/ui';
import { useTryStore } from '../../lib/tryStore';
import { useExitTry } from '../../lib/useExitTry';

// B2C · Ton idée — prompt-first intent screen after the selfie. The prompt is the hero (with
// example chips), and "L'IA te propose" is the highlighted zero-effort path. No manual sliders:
// the free-text prompt covers length/colour/fringe far better.
const ACCENT = MPAL.ink;
const ON_DARK = pOnDark(ACCENT); // caramel on the dark AI card

export default function Idea() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const session = useSession();
  const { data: credits } = useCredits(session?.user.id);
  const setBrief = useTryStore((s) => s.setBrief);
  const exitTry = useExitTry();

  const [prompt, setPrompt] = useState('');

  const examples = lang === 'fr' ? ['Wolf cut châtain', 'Carré flou caramel', 'Pixie audacieux', 'Boucles définies', 'Reflets miel doux'] : ['Ash-brown wolf cut', 'Caramel soft bob', 'Bold pixie', 'Defined curls', 'Soft honey highlights'];
  const canGenerate = prompt.trim().length > 0;

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
        {/* X = close the whole flow and land back on the home tab (see useExitTry). */}
        <Pressable hitSlop={8} onPress={() => exitTry()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
          <MIcon name="x" size={18} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <MText variant="serif" size={32} style={{ marginTop: 8, lineHeight: 34 }}>
          {lang === 'fr' ? 'Décris la coupe que tu veux.' : 'Describe the cut you want.'}
        </MText>

        {/* prompt hero */}
        <View style={{ marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border }}>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder={t('prompt_placeholder')}
            placeholderTextColor={MPAL.mute}
            multiline
            maxLength={240}
            style={{ minHeight: 84, fontFamily: prompt ? FONTS.serif : FONTS.serifItalic, fontSize: 18, color: MPAL.ink, lineHeight: 25 }}
          />
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
            <Pressable key={i} onPress={() => setPrompt(e)} style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border }}>
              <MText variant="serifItalic" size={12} color={MPAL.ink}>
                {e}
              </MText>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>

      {/* generate + alternatives */}
      <LinearGradient colors={['rgba(252,248,244,0)', MPAL.bg]} style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 14, gap: 12 }}>
        <PrimaryButton
          label={t('generate')}
          tone="caramel"
          icon="sparkle"
          disabled={!canGenerate}
          onPress={() => {
            setBrief({ prompt: prompt.trim() });
            router.push('/try/generating');
          }}
        />
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

        {/* AI proposes — highlighted. Suggest is free, but it only leads somewhere if the user can
            generate (1 credit), so at 0 credits we skip straight to recharge instead of aipropose. */}
        <Pressable
          onPress={() => {
            if ((credits ?? 0) <= 0) {
              toast(lang === 'fr' ? 'Recharge pour que Mèche te propose une coupe à essayer.' : 'Recharge so Mèche can suggest a look to try.');
              router.push('/recharge?low=1');
              return;
            }
            router.push('/try/aipropose');
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, backgroundColor: MPAL.ink, overflow: 'hidden' }}
        >
          <View style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: `${ON_DARK}33` }} />
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: ON_DARK, alignItems: 'center', justifyContent: 'center' }}>
            <MIcon name="sparkle" size={22} color="#fff" fill="#fff" stroke={0} />
          </View>
          <View style={{ flex: 1 }}>
            <MText variant="serif" size={18} color="#fff">
              {t('path_ai')}
            </MText>
            <MText size={12} color="rgba(255,255,255,0.7)" style={{ marginTop: 1 }}>
              {lang === 'fr' ? "Pas d'idée ? Mèche choisit pour toi." : 'No idea? Mèche picks for you.'}
            </MText>
          </View>
          <MIcon name="arrowRight" size={18} color={ON_DARK} />
        </Pressable>

      </LinearGradient>
    </View>
  );
}

import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCredits, useSession } from '@meche/api-client';
import { FONTS, MIcon, MPAL, MText, PrimaryButton, Slider, pOnDark, useLang, useT } from '@meche/ui';
import { useTryStore } from '../../lib/tryStore';

// B2C · Ton idée (refactored hub) — prompt-first intent screen after the selfie. The prompt
// (text + voice) is the hero; "L'IA te propose" is the highlighted zero-effort path; the gallery
// is a quiet secondary; manual sliders live behind a collapsible "Réglages avancés".
const ACCENT = MPAL.ink;
const ON_DARK = pOnDark(ACCENT); // caramel on the dark AI card
const COLORS = ['#1A1612', '#5A3A20', '#A07242', '#D9B987', '#E8C9A0'];
const COLOR_NAMES = ['Noir', 'Châtain', 'Caramel', 'Miel', 'Blond'];

export default function Idea() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const session = useSession();
  const { data: credits } = useCredits(session?.user.id);
  const setBrief = useTryStore((s) => s.setBrief);

  const [prompt, setPrompt] = useState('');
  const [listening, setListening] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [len, setLen] = useState(0.4);
  const [fringe, setFringe] = useState(0.3);
  const [col, setCol] = useState(2);

  const examples = lang === 'fr' ? ['Wolf cut châtain', 'Carré flou caramel', 'Pixie audacieux', 'Boucles définies', 'Reflets miel doux'] : ['Ash-brown wolf cut', 'Caramel soft bob', 'Bold pixie', 'Defined curls', 'Soft honey highlights'];
  const canGenerate = prompt.trim().length > 0 || advanced;

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top + 6 }}>
      {/* chrome */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
          <MIcon name="chevronLeft" size={18} />
        </Pressable>
        <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.6 }}>
          {lang === 'fr' ? 'ÉTAPE 2 · TON IDÉE' : 'STEP 2 · YOUR IDEA'}
        </MText>
        <Pressable onPress={() => router.dismissAll()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <Pressable onPress={() => setListening((l) => !l)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: listening ? MPAL.ink : 'transparent', borderWidth: listening ? 0 : 1, borderColor: MPAL.border }}>
              <MIcon name="mic" size={14} color={listening ? '#fff' : MPAL.ink} />
              <MText variant="bodySemibold" size={12} color={listening ? '#fff' : MPAL.ink}>
                {listening ? t('listening') : lang === 'fr' ? 'Dicter' : 'Dictate'}
              </MText>
            </Pressable>
            <MText variant="mono" size={10} color={MPAL.mute}>
              {prompt.length}/240
            </MText>
          </View>
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

        {/* collapsible advanced settings */}
        <Pressable onPress={() => setAdvanced((a) => !a)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18 }}>
          <MIcon name={advanced ? 'chevronLeft' : 'chevronRight'} size={14} color={MPAL.mute} />
          <MText variant="bodySemibold" size={12} color={MPAL.mute} style={{ letterSpacing: 0.4 }}>
            {lang === 'fr' ? 'Réglages avancés' : 'Advanced settings'}
          </MText>
        </Pressable>
        {advanced ? (
          <View style={{ marginTop: 12, gap: 16, padding: 18, borderRadius: 14, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border }}>
            <Slider label={t('length')} value={len} onChange={setLen} accent={MPAL.ink} notches={[lang === 'fr' ? 'Court' : 'Short', lang === 'fr' ? 'Mi-long' : 'Medium', lang === 'fr' ? 'Long' : 'Long']} />
            <Slider label={t('fringe')} value={fringe} onChange={setFringe} accent={MPAL.ink} notches={[lang === 'fr' ? 'Sans' : 'None', lang === 'fr' ? 'Légère' : 'Light', lang === 'fr' ? 'Rideau' : 'Curtain']} />
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <MText variant="bodyMedium" size={14}>
                  {t('color')}
                </MText>
                <MText size={12} color={MPAL.mute}>
                  {COLOR_NAMES[col]}
                </MText>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {COLORS.map((c, i) => (
                  <Pressable key={i} onPress={() => setCol(i)} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: c, borderWidth: col === i ? 3 : 1, borderColor: col === i ? MPAL.ink : MPAL.border }} />
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* generate + alternatives */}
      <LinearGradient colors={['rgba(252,248,244,0)', MPAL.bg]} style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 14, gap: 12 }}>
        <PrimaryButton
          label={t('generate')}
          tone="caramel"
          icon="sparkle"
          disabled={!canGenerate}
          onPress={() => {
            setBrief({
              prompt: prompt.trim() || undefined,
              length: advanced ? len : undefined,
              fringe: advanced ? fringe : undefined,
              color: advanced ? COLOR_NAMES[col] : undefined,
            });
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

        {/* AI proposes — highlighted */}
        <Pressable onPress={() => router.push('/try/aipropose')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, backgroundColor: MPAL.ink, overflow: 'hidden' }}>
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

        <MText variant="bodyMedium" size={13} color={MPAL.mute} onPress={() => router.push('/try/gallery')} style={{ textAlign: 'center', paddingVertical: 2 }}>
          {lang === 'fr' ? 'Parcourir la galerie' : 'Browse the gallery'} →
        </MText>
      </LinearGradient>
    </View>
  );
}

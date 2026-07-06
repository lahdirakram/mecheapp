import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProStatus, useSession } from '@meche/api-client';
import { FONTS, MIcon, MPAL, MText, PrimaryButton, useLang } from '@meche/ui';
import { useTryStore } from '../../lib/tryStore';
import { useExitTry } from '../../lib/useExitTry';

// Pro · L'idée de la cliente — prompt-first, ported from the B2C "Ton idée". The stylist writes
// what the client wants (or hands her the phone); example chips prime the wording.
export default function Idea() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lang = useLang();
  const session = useSession();
  const { data: status } = useProStatus(session?.user.id);
  const setBrief = useTryStore((s) => s.setBrief);
  const exitTry = useExitTry();

  const [prompt, setPrompt] = useState('');
  const [clientName, setClientName] = useState('');

  const examples =
    lang === 'fr'
      ? ['Wolf cut châtain', 'Carré flou caramel', 'Pixie audacieux', 'Boucles définies', 'Reflets miel doux']
      : ['Ash-brown wolf cut', 'Caramel soft bob', 'Bold pixie', 'Defined curls', 'Soft honey highlights'];
  const canGenerate = prompt.trim().length > 0;

  const quotaLine = status?.sub_active
    ? lang === 'fr'
      ? `${Math.max(0, 100 - (status?.month ?? 0))} essais restants ce mois-ci`
      : `${Math.max(0, 100 - (status?.month ?? 0))} try-ons left this month`
    : lang === 'fr'
      ? `${Math.max(0, 3 - (status?.lifetime ?? 0))} essais offerts restants`
      : `${Math.max(0, 3 - (status?.lifetime ?? 0))} free try-ons left`;

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top + 6 }}>
      {/* chrome */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
          <MIcon name="chevronLeft" size={18} />
        </Pressable>
        <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.6 }}>
          {lang === 'fr' ? 'ÉTAPE 2 · SON IDÉE' : 'STEP 2 · HER IDEA'}
        </MText>
        <Pressable hitSlop={8} onPress={() => exitTry()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
          <MIcon name="x" size={18} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <MText variant="serif" size={32} style={{ marginTop: 8, lineHeight: 34 }}>
          {lang === 'fr' ? 'Décris la coupe qu’elle veut.' : 'Describe the cut she wants.'}
        </MText>

        {/* prompt hero */}
        <View style={{ marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border }}>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder={lang === 'fr' ? 'Un carré plongeant caramel, avec de la matière…' : 'A caramel angled bob, with texture…'}
            placeholderTextColor={MPAL.mute}
            multiline
            maxLength={240}
            style={{ minHeight: 84, fontFamily: prompt ? FONTS.serif : FONTS.serifItalic, fontSize: 18, color: MPAL.ink, lineHeight: 25 }}
          />
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

        {/* client first name — optional, powers the per-client history filter */}
        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 4 }}>
          <MIcon name="user" size={15} color={MPAL.mute} />
          <TextInput
            value={clientName}
            onChangeText={setClientName}
            placeholder={lang === 'fr' ? 'Prénom de la cliente (optionnel)' : 'Client first name (optional)'}
            placeholderTextColor={MPAL.mute}
            maxLength={40}
            autoCapitalize="words"
            style={{ flex: 1, fontFamily: FONTS.body, fontSize: 14, color: MPAL.ink, paddingVertical: 10 }}
          />
        </View>
        <MText size={11} color={MPAL.mute} style={{ marginTop: 6, marginLeft: 4 }}>
          {lang === 'fr' ? 'Pour retrouver ses essais dans ton historique.' : 'To find her try-ons in your history.'}
        </MText>
      </ScrollView>

      {/* generate */}
      <LinearGradient colors={['rgba(252,248,244,0)', MPAL.bg]} style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 14, gap: 10 }}>
        <PrimaryButton
          label={lang === 'fr' ? 'Générer l’essai' : 'Generate the try-on'}
          tone="caramel"
          icon="sparkle"
          disabled={!canGenerate}
          onPress={() => {
            setBrief({ prompt: prompt.trim(), clientName: clientName.trim() || undefined });
            router.push('/try/generating');
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -2 }}>
          <MIcon name="sparkle" size={11} color={MPAL.mute} />
          <MText size={11} color={MPAL.mute}>
            {quotaLine}
          </MText>
        </View>
      </LinearGradient>
    </View>
  );
}

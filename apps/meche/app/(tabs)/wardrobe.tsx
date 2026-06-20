import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDeleteLook, useSession, useSignedUrls, useWardrobe } from '@meche/api-client';
import type { HairShape, PortraitMood } from '@meche/core';
import { MIcon, MPAL, MText, MPortrait, TopBar, useLang, useSheet, useT } from '@meche/ui';
import { useTryStore } from '../../lib/tryStore';

// B2C · Mes mèches (17) — kept looks, sort tabs (Récents/Préférés/Pour cet été), staggered
// grid + a "surprise cut" prompt. Ported from MScreenWardrobe. Falls back to demo looks until
// the user has saved their own.
type Look = { id: string; name: string; hair: HairShape; mood: PortraitMood; loved: boolean; tag: string | null; image_url?: string | null; generation_id?: string | null; generation?: { status?: string } | null };

export default function Wardrobe() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const session = useSession();
  const { data } = useWardrobe(session?.user.id);
  const sheet = useSheet();
  const { mutate: deleteLook } = useDeleteLook();
  const [tab, setTab] = useState(0);
  const resetTry = useTryStore((s) => s.reset);
  const setSurprise = useTryStore((s) => s.setSurprise);
  // Fresh generic try (reset wipes any stale brief/directMode); "surprise" then routes to Mèche's pick.
  const startTry = () => { resetTry(); router.push('/try'); };
  const startSurprise = () => { resetTry(); setSurprise(true); router.push('/try'); };
  // A background generation that errored out: the credit was refunded. Offer a fresh retry or remove
  // it, so the card is an honest dead-end instead of silently disappearing.
  const onFailed = (look: Look) => {
    const remove = () => deleteLook({ lookId: look.id, generationId: look.generation_id ?? undefined });
    sheet({
      title: lang === 'fr' ? 'Cette mèche n’a pas pu être générée' : 'This look could not be generated',
      message: lang === 'fr' ? 'Ton crédit a été conservé. Tu peux réessayer.' : 'Your credit was kept. You can try again.',
      options: [
        { label: lang === 'fr' ? 'Réessayer' : 'Try again', onPress: () => { remove(); resetTry(); router.push('/try'); } },
        { label: lang === 'fr' ? 'Supprimer' : 'Delete', destructive: true, onPress: remove },
        { label: lang === 'fr' ? 'Annuler' : 'Cancel', cancel: true },
      ],
    });
  };

  const base = (data ?? []) as Look[]; // real saved looks only — no demo fallback
  // Generated images are private storage paths → sign for display; feed photos are external URLs.
  const { data: signed = {} } = useSignedUrls('generated', useMemo(() => base.map((l) => l.image_url), [base]));
  const srcOf = (u?: string | null) => (!u ? undefined : /^https?:\/\//.test(u) ? u : signed[u]);
  // Tout · Mes essais (generated, has generation_id) · Enregistrées (saved from feed/galerie)
  const looks: Look[] = tab === 1 ? base.filter((l) => l.generation_id) : tab === 2 ? base.filter((l) => !l.generation_id) : base;
  const tabs = [lang === 'fr' ? 'Tout' : 'All', lang === 'fr' ? 'Mes essais' : 'My tries', lang === 'fr' ? 'Enregistrées' : 'Saved'];

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top }}>
      <TopBar
        title={t('your_looks')}
        big
        right={
          <Pressable hitSlop={8} onPress={startTry} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
            <MIcon name="plus" size={18} color={MPAL.ink} />
          </Pressable>
        }
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8, paddingTop: 2, paddingBottom: 14 }}>
        {tabs.map((label, i) => (
          <Pressable key={i} onPress={() => setTab(i)} style={{ alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: tab === i ? MPAL.ink : MPAL.paper, borderWidth: 1, borderColor: tab === i ? MPAL.ink : MPAL.border }}>
            <MText variant="bodySemibold" size={13} color={tab === i ? MPAL.inkInv : MPAL.ink} style={{ lineHeight: 18 }}>
              {label}
            </MText>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {looks.map((w, i) => {
            // A background try-on still cooking: "generating" placeholder, tap disabled. 'failed'
            // shows a retry card (credit was refunded). Otherwise it's a normal saved look.
            const pending = w.generation?.status === 'pending';
            const failed = w.generation?.status === 'failed';
            return (
            <Pressable
              key={w.id}
              disabled={pending}
              onPress={() =>
                failed
                  ? onFailed(w)
                  : w.generation_id
                    ? router.push({ pathname: '/try/result', params: { generationId: w.generation_id, lookId: w.id, name: w.name, after: w.image_url ?? '', loved: w.loved ? '1' : '0' } })
                    : router.navigate({ pathname: '/(tabs)/explore', params: { focus: w.image_url ?? w.name, t: String(Date.now()) } })
              }
              style={{ width: '48%', aspectRatio: 3 / 4, borderRadius: 18, overflow: 'hidden', backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border, marginBottom: 12 }}
            >
              {pending ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <ActivityIndicator color={MPAL.sable} />
                  <MText variant="mono" size={9} color={MPAL.mute} style={{ letterSpacing: 1.4 }}>
                    {lang === 'fr' ? 'CRÉATION…' : 'CREATING…'}
                  </MText>
                </View>
              ) : failed ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 12 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: MPAL.subtle }}>
                    <MIcon name="x" size={18} color={MPAL.mute} />
                  </View>
                  <MText variant="mono" size={9} color={MPAL.mute} style={{ letterSpacing: 1.4, textAlign: 'center' }}>
                    {lang === 'fr' ? 'ÉCHEC · RÉESSAYER' : 'FAILED · RETRY'}
                  </MText>
                </View>
              ) : srcOf(w.image_url) ? (
                <Image source={{ uri: srcOf(w.image_url), cacheKey: w.image_url ?? undefined }} style={{ flex: 1 }} contentFit="cover" transition={0} cachePolicy="memory-disk" recyclingKey={w.image_url ?? undefined} />
              ) : (
                <MPortrait hair={w.hair} mood={w.mood} tint={i % 3 === 0 ? MPAL.ink : undefined} />
              )}
              {w.loved && !pending ? (
                <View style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
                  <MIcon name="heart" size={14} color={MPAL.sable} fill={MPAL.sable} stroke={0} />
                </View>
              ) : null}
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 24, paddingHorizontal: 10, paddingBottom: 10, backgroundColor: 'rgba(0,0,0,0.35)' }}>
                <MText variant="bodySemibold" size={12} color="#fff" numberOfLines={1}>
                  {w.name}
                </MText>
                {w.tag ? (
                  <MText variant="mono" size={9} color="rgba(255,255,255,0.75)" style={{ marginTop: 2 }}>
                    · {w.tag.toUpperCase()}
                  </MText>
                ) : null}
              </View>
            </Pressable>
          );
          })}
        </View>

        {looks.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 36, paddingBottom: 20, gap: 10 }}>
            <MIcon name="bookmark" size={30} color={MPAL.mute} />
            <MText variant="serif" size={20} style={{ textAlign: 'center' }}>
              {tab === 1
                ? lang === 'fr'
                  ? 'Aucun essai pour l’instant'
                  : 'No tries yet'
                : tab === 2
                  ? lang === 'fr'
                    ? 'Rien d’enregistré'
                    : 'Nothing saved'
                  : lang === 'fr'
                    ? 'Ta penderie est vide'
                    : 'Your wardrobe is empty'}
            </MText>
            <MText size={13} color={MPAL.mute} style={{ textAlign: 'center', maxWidth: 270, lineHeight: 19 }}>
              {lang === 'fr' ? 'Essaie une coupe avec le bouton ✦, garde celles que tu aimes.' : 'Try a cut with the ✦ button, keep the ones you love.'}
            </MText>
          </View>
        ) : null}

        {/* surprise cut → Mèche picks for you (AI propose) */}
        <Pressable onPress={startSurprise} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 18, backgroundColor: MPAL.paper, borderWidth: 1, borderStyle: 'dashed', borderColor: MPAL.border }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: MPAL.subtle, alignItems: 'center', justifyContent: 'center' }}>
            <MIcon name="sparkle" size={22} color={MPAL.sable} fill={MPAL.sable} stroke={0} />
          </View>
          <View style={{ flex: 1 }}>
            <MText variant="serif" size={18}>
              {lang === 'fr' ? 'Essaye une coupe surprise' : 'Try a surprise cut'}
            </MText>
            <MText size={11} color={MPAL.mute} style={{ marginTop: 2 }}>
              {lang === 'fr' ? 'Mèche choisit pour toi' : 'Mèche picks for you'}
            </MText>
          </View>
          <MIcon name="chevronRight" size={18} color={MPAL.mute} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

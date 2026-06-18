import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSaveLook, useSession } from '@meche/api-client';
import { MIcon, MPAL, MText, MPortrait, TopBar, useLang, useSheet, useT, useToast } from '@meche/ui';
import { useTryStore } from '../../lib/tryStore';
import type { HairShape, PortraitMood } from '@meche/core';

// Filter chip index → which hair shapes qualify (null = all).
const FILTER_HAIR: (HairShape[] | null)[] = [null, null, ['pixie', 'bob'], ['bob', 'medium'], ['long', 'curly'], null];

// B2C · Galerie (05) — catalogue by style with filter chips + staggered 2-col grid.
// Ported from MScreenGallery. Tapping a look → try it on (generating).
const ITEMS: { n: Record<'fr' | 'en', string>; hair: HairShape; mood: PortraitMood; loves: string; hot?: boolean }[] = [
  { n: { fr: 'Carré flou', en: 'Soft bob' }, hair: 'bob', mood: 'warm', loves: '12k', hot: true },
  { n: { fr: 'Wolf cut', en: 'Wolf cut' }, hair: 'long', mood: 'cool', loves: '8k', hot: true },
  { n: { fr: 'Pixie texturé', en: 'Pixie' }, hair: 'pixie', mood: 'night', loves: '4.7k' },
  { n: { fr: 'Boucles miel', en: 'Honey curls' }, hair: 'curly', mood: 'blush', loves: '19k', hot: true },
  { n: { fr: 'Long lisse', en: 'Sleek long' }, hair: 'long', mood: 'sand', loves: '6k' },
  { n: { fr: 'Bob aile', en: 'Wing bob' }, hair: 'bob', mood: 'olive', loves: '3.1k' },
  { n: { fr: 'Short rouge', en: 'Short red' }, hair: 'pixie', mood: 'blush', loves: '2.4k' },
  { n: { fr: 'Curly platine', en: 'Platinum curl' }, hair: 'curly', mood: 'cool', loves: '5.3k' },
];

export default function Gallery() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const session = useSession();
  const toast = useToast();
  const sheet = useSheet();
  const setBrief = useTryStore((s) => s.setBrief);
  const { mutate: saveLook } = useSaveLook();
  const [filter, setFilter] = useState(0);
  const [azSort, setAzSort] = useState(false);
  const filters = [t('gallery_filter_all'), t('gallery_filter_trends'), t('gallery_filter_short'), t('gallery_filter_mid'), t('gallery_filter_long'), t('gallery_filter_color')];

  const hairFilter = FILTER_HAIR[filter];
  let view = ITEMS.filter((it) => (filter === 1 ? it.hot : hairFilter ? hairFilter.includes(it.hair) : true));
  if (azSort) view = [...view].sort((a, b) => a.n[lang].localeCompare(b.n[lang]));

  const onSave = (name: string, hair: HairShape, mood: PortraitMood) => {
    if (!session) {
      toast(lang === 'fr' ? 'Connecte-toi pour garder tes mèches.' : 'Sign in to keep looks.');
      return;
    }
    saveLook({ userId: session.user.id, name, hair, mood });
    toast(lang === 'fr' ? 'Gardé dans Mes mèches.' : 'Kept in My looks.');
  };

  const openSort = () =>
    sheet({
      title: lang === 'fr' ? 'Trier' : 'Sort',
      options: [
        { label: lang === 'fr' ? 'Populaires' : 'Popular', onPress: () => setAzSort(false) },
        { label: 'A → Z', onPress: () => setAzSort(true) },
        { label: lang === 'fr' ? 'Annuler' : 'Cancel', cancel: true },
      ],
    });

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top }}>
      <TopBar
        title={t('path_gallery')}
        big
        onBack={() => router.back()}
        right={
          <Pressable hitSlop={8} onPress={openSort} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
            <MIcon name="settings" size={16} color={MPAL.ink} />
          </Pressable>
        }
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8, paddingBottom: 14 }}>
        {filters.map((f, i) => (
          <Pressable key={i} onPress={() => setFilter(i)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: filter === i ? MPAL.ink : MPAL.paper, borderWidth: 1, borderColor: filter === i ? MPAL.ink : MPAL.border }}>
            <MText variant="bodySemibold" size={13} color={filter === i ? MPAL.inkInv : MPAL.ink}>
              {f}
            </MText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 18, paddingBottom: 6 }}>
        <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.4 }}>
          {lang === 'fr' ? 'TENDANCES MAI 2026' : 'TRENDING MAY 2026'}
        </MText>
        <MText variant="mono" size={10} color={MPAL.mute}>
          {ITEMS.length} {lang === 'fr' ? 'COUPES' : 'LOOKS'}
        </MText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {view.map((it, i) => (
            <Pressable
              key={`${it.n.en}${i}`}
              onPress={() => {
                setBrief({ lookName: it.n[lang] });
                router.push('/try/generating');
              }}
              style={{ width: '48%', aspectRatio: 3 / 4, borderRadius: 16, overflow: 'hidden', backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border, marginTop: i % 2 ? 10 : 0, marginBottom: 10 }}
            >
              <MPortrait hair={it.hair} mood={it.mood} tint={i % 3 === 0 ? MPAL.ink : undefined} />
              {it.hot ? (
                <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: MPAL.ink }}>
                  <MIcon name="flame" size={10} color="#fff" fill="#fff" stroke={0} />
                  <MText variant="mono" size={9} color="#fff" style={{ letterSpacing: 0.8 }}>
                    {lang === 'fr' ? 'CHAUD' : 'HOT'}
                  </MText>
                </View>
              ) : null}
              <Pressable hitSlop={10} onPress={() => onSave(it.n[lang], it.hair, it.mood)} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>
                <MIcon name="plus" size={14} color={MPAL.ink} />
              </Pressable>
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 24, paddingHorizontal: 10, paddingBottom: 10 }}>
                <MText variant="bodySemibold" size={13} color="#fff">
                  {it.n[lang]}
                </MText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <MIcon name="heart" size={10} color="#fff" fill="#fff" stroke={0} />
                  <MText size={10} color="rgba(255,255,255,0.85)">
                    {it.loves}
                  </MText>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

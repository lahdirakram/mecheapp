import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession, useSignedUrls, useWardrobe } from '@meche/api-client';
import { FONTS, MIcon, MPAL, MText, TopBar, useLang } from '@meche/ui';
import { cacheKeyFor } from '../../lib/img';
import { useLocalImages } from '../../lib/localImages';

interface LookRow {
  id: string;
  name: string;
  image_url: string | null;
  generation_id: string | null;
  client_name: string | null;
  created_at: string;
  generation?: { status?: string } | null;
}

// Max quick-access chips: the MOST RECENT clients only. The search field is the scalable path —
// with 100 clientes, chips are shortcuts, typing 2 letters is the real filter.
const MAX_CHIPS = 6;

// Case- and accent-insensitive match ("lea" finds "Léa").
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Essais · full try-on history, its own tab. Search by client first name (or look name), with
// recent-client chips as shortcuts.
export default function Essais() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lang = useLang();
  const session = useSession();
  const { data: looks } = useWardrobe(session?.user.id);
  const [query, setQuery] = useState('');
  const [chipFilter, setChipFilter] = useState<string | null>(null); // null = all, '' = unnamed

  const history = useMemo(() => ((looks ?? []) as LookRow[]).filter((l) => l.generation_id), [looks]);

  // Recent clients, most recent first (history is already newest-first).
  const recentClients = useMemo(() => {
    const seen: string[] = [];
    for (const l of history) {
      const c = (l.client_name ?? '').trim();
      if (c && !seen.includes(c)) seen.push(c);
      if (seen.length >= MAX_CHIPS) break;
    }
    return seen;
  }, [history]);

  const q = fold(query.trim());
  const shown = history.filter((l) => {
    const client = (l.client_name ?? '').trim();
    // Typing replaces the chip filter entirely.
    if (q) return fold(client).includes(q) || fold(l.name).includes(q);
    if (chipFilter === null) return true;
    return chipFilter === '' ? client === '' : client === chipFilter;
  });

  const paths = shown.map((l) => l.image_url);
  const { data: localMap, pending: localPending } = useLocalImages('generated', paths);
  const { data: signedMap } = useSignedUrls('generated', paths);
  const uriFor = (p: string | null) => {
    if (!p) return null;
    if (localMap[p]) return localMap[p];
    if (localPending.has(p)) return null;
    return signedMap?.[p] ?? null;
  };

  const dateFor = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString())
      return `${lang === 'fr' ? "aujourd'hui" : 'today'} ${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const openLook = (l: LookRow) =>
    router.push({
      pathname: '/try/result',
      params: { generationId: l.generation_id!, lookId: l.id, name: l.name, clientName: l.client_name ?? '' },
    });

  const chip = (label: string, value: string | null) => {
    const on = !q && chipFilter === value;
    return (
      <Pressable
        key={value ?? '__all'}
        onPress={() => {
          setQuery('');
          setChipFilter(value);
        }}
        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? MPAL.ink : MPAL.paper, borderWidth: 1, borderColor: on ? MPAL.ink : MPAL.border }}
      >
        <MText variant="bodySemibold" size={13} color={on ? '#fff' : MPAL.ink}>
          {label}
        </MText>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top }}>
      <TopBar title={lang === 'fr' ? 'Essais' : 'Try-ons'} big />

      {/* search — the scalable way in */}
      <View style={{ marginHorizontal: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border, borderRadius: 999, paddingHorizontal: 16 }}>
        <MIcon name="search" size={16} color={MPAL.mute} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={lang === 'fr' ? 'Rechercher une cliente ou une coupe…' : 'Search a client or a cut…'}
          placeholderTextColor={MPAL.mute}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, fontFamily: FONTS.body, fontSize: 14, color: MPAL.ink, paddingVertical: 12 }}
        />
        {query ? (
          <Pressable hitSlop={10} onPress={() => setQuery('')}>
            <MIcon name="x" size={14} color={MPAL.mute} />
          </Pressable>
        ) : null}
      </View>

      {/* shortcuts: the most recent clients only */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {chip(lang === 'fr' ? 'Toutes' : 'All', null)}
        {recentClients.map((c) => chip(c, c))}
        {history.some((l) => !(l.client_name ?? '').trim()) ? chip(lang === 'fr' ? 'Sans prénom' : 'Unnamed', '') : null}
      </ScrollView>

      {shown.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12, paddingBottom: 120 }}>
          <MIcon name="search" size={26} color={MPAL.mute} />
          <MText size={13} color={MPAL.mute} style={{ textAlign: 'center', lineHeight: 19 }}>
            {q
              ? lang === 'fr'
                ? `Aucun essai pour « ${query.trim()} ».`
                : `No try-on for “${query.trim()}”.`
              : lang === 'fr'
                ? 'Aucun essai ici pour le moment.'
                : 'No try-ons here yet.'}
          </MText>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {shown.map((l) => {
              const genStatus = l.generation?.status;
              const uri = genStatus === 'done' ? uriFor(l.image_url) : null;
              const client = (l.client_name ?? '').trim();
              return (
                <Pressable
                  key={l.id}
                  onPress={() => (genStatus === 'done' ? openLook(l) : undefined)}
                  style={{ width: '48%', flexGrow: 1, maxWidth: '49%', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: MPAL.border, backgroundColor: MPAL.paper }}
                >
                  <View style={{ aspectRatio: 3 / 4, alignItems: 'center', justifyContent: 'center' }}>
                    {uri ? (
                      <Image source={{ uri, cacheKey: cacheKeyFor(uri) }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
                    ) : genStatus === 'pending' ? (
                      <>
                        <ActivityIndicator color={MPAL.sable} />
                        <MText variant="mono" size={8} color={MPAL.mute} style={{ marginTop: 6, letterSpacing: 0.8 }}>
                          {lang === 'fr' ? 'EN COURS' : 'WORKING'}
                        </MText>
                      </>
                    ) : genStatus === 'failed' ? (
                      <MText variant="mono" size={8} color={MPAL.warn} style={{ letterSpacing: 0.8 }}>
                        {lang === 'fr' ? 'ÉCHOUÉ' : 'FAILED'}
                      </MText>
                    ) : (
                      <ActivityIndicator color={MPAL.mute} />
                    )}
                    {client ? (
                      <View style={{ position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)' }}>
                        <MText variant="bodySemibold" size={10} color={MPAL.ink}>
                          {client}
                        </MText>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 8, gap: 2 }}>
                    <MText variant="bodySemibold" size={12} numberOfLines={1}>
                      {l.name}
                    </MText>
                    <MText variant="mono" size={9} color={MPAL.mute}>
                      {dateFor(l.created_at)}
                    </MText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

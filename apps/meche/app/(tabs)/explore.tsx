import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSaveLook, useSession, useSupabase, useUnsaveLook, useWardrobe } from '@meche/api-client';
import { useLang, useToast, MIcon, MPAL, MText, MPortrait, type Lang } from '@meche/ui';
import { useTryStore } from '../../lib/tryStore';
import type { FeedSource, HairShape, PortraitMood } from '@meche/core';

type Row = {
  id: string;
  kind: FeedSource;
  name: Record<Lang, string>;
  hair: HairShape;
  mood: PortraitMood;
  loves: string | null;
  descr: Record<Lang, string> | null;
  label: Record<Lang, string> | null;
  by: Record<Lang, string> | null;
  match: number | null;
  image_url: string | null;
};

const SRC_META: Record<FeedSource, { icon: 'sparkle' | 'pin' | 'user'; tint: string }> = {
  studio: { icon: 'sparkle', tint: MPAL.ink },
  salon: { icon: 'pin', tint: MPAL.salon },
  user: { icon: 'user', tint: MPAL.community },
};

const PAGE = 3; // lazy-load a few looks at a time (recommendation feed, not a fixed list)

// B2C · Découvrir — full-bleed TikTok/Reels vertical pager. Looks load progressively as you
// scroll. Opened from a saved look (?focus=image_url) → that photo is shown first, then the
// feed continues normally. (Backed by feed_items today; swap to a reco endpoint later.)
export default function Explore() {
  const insets = useSafeAreaInsets();
  const lang = useLang();
  const sb = useSupabase();
  const session = useSession();
  const { data: savedLooks } = useWardrobe(session?.user.id);
  const savedImages = useMemo(
    () => new Set(((savedLooks as { image_url?: string | null; generation_id?: string | null }[] | undefined) ?? []).filter((l) => !l.generation_id && l.image_url).map((l) => l.image_url as string)),
    [savedLooks],
  );
  const { focus, t } = useLocalSearchParams<{ focus?: string; t?: string }>();
  const [items, setItems] = useState<Row[]>([]);
  const [filter, setFilter] = useState<'all' | FeedSource>('all');
  const [h, setH] = useState(Dimensions.get('window').height);
  const listRef = useRef<FlatList<Row>>(null);
  const offsetRef = useRef(0);
  const dbDoneRef = useRef(false); // exhausted the feed_items table → switch to recycling
  const loadingRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());
  const poolRef = useRef<Row[]>([]); // every distinct look loaded, reused for infinite scroll
  const cycleRef = useRef(0);

  const fetchPage = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!dbDoneRef.current) {
      const from = offsetRef.current;
      const { data } = await sb.from('feed_items').select('*').order('created_at').range(from, from + PAGE - 1);
      const batch = (data ?? []) as Row[];
      offsetRef.current = from + PAGE;
      if (batch.length < PAGE) dbDoneRef.current = true;
      const fresh = batch.filter((r) => !seenRef.current.has(r.id));
      fresh.forEach((r) => {
        seenRef.current.add(r.id);
        poolRef.current.push(r);
      });
      if (fresh.length) setItems((prev) => [...prev, ...fresh]);
      loadingRef.current = false;
      return;
    }
    // Feed exhausted → keep scrolling forever by recycling the pool with fresh keys.
    const pool = poolRef.current;
    if (pool.length) {
      const start = cycleRef.current;
      const batch = Array.from({ length: PAGE }, (_, i) => {
        const base = pool[(start + i) % pool.length];
        return { ...base, id: `${base.id}#r${start + i}` };
      });
      cycleRef.current = start + PAGE;
      setItems((prev) => [...prev, ...batch]);
    }
    loadingRef.current = false;
  }, [sb]);

  // Lead with the focused (saved) look if any, then load the rest progressively.
  // Reset pagination each time focus changes (the tab persists, so refs would otherwise be stale).
  useEffect(() => {
    let cancelled = false;
    offsetRef.current = 0;
    dbDoneRef.current = false;
    loadingRef.current = false;
    seenRef.current = new Set();
    poolRef.current = [];
    cycleRef.current = 0;
    setItems([]);
    (async () => {
      if (focus) {
        const { data: lead } = await sb.from('feed_items').select('*').eq('image_url', String(focus)).limit(1).maybeSingle();
        if (lead && !cancelled) {
          seenRef.current.add((lead as Row).id);
          poolRef.current.push(lead as Row);
          setItems([lead as Row]);
          // Tab persists across navigations → force the pager back to the lead photo.
          requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }));
        }
      }
      if (!cancelled) await fetchPage();
    })();
    return () => {
      cancelled = true;
    };
    // `t` is a per-navigation key so re-clicking the SAME saved photo re-leads the feed.
  }, [focus, t, sb, fetchPage]);

  const rows = filter === 'all' ? items : items.filter((r) => r.kind === filter);
  // Only "Pour toi" for now — the other source filters are hidden until they earn their place.
  const filters: { id: 'all' | FeedSource; l: string }[] = [
    { id: 'all', l: lang === 'fr' ? 'Pour toi' : 'For you' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(it) => it.id}
        pagingEnabled
        snapToInterval={h}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onEndReached={() => fetchPage()}
        onEndReachedThreshold={0.8}
        ListFooterComponent={rows.length > 0 ? <View style={{ height: 60, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#fff" /></View> : null}
        renderItem={({ item }) => <Reel card={item} height={h} lang={lang} insetsTop={insets.top} savedImages={savedImages} />}
      />

      {/* fixed top filter pills */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, flexDirection: 'row', gap: 6 }}>
        {filters.map((f) => {
          const on = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: on ? '#fff' : 'rgba(0,0,0,0.4)',
                borderWidth: on ? 0 : 1,
                borderColor: 'rgba(255,255,255,0.18)',
              }}
            >
              <MText variant="bodySemibold" size={13} color={on ? MPAL.ink : '#fff'}>
                {f.l}
              </MText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Reel({ card, height, lang, insetsTop, savedImages }: { card: Row; height: number; lang: Lang; insetsTop: number; savedImages: Set<string> }) {
  const meta = SRC_META[card.kind];
  const router = useRouter();
  const session = useSession();
  const toast = useToast();
  const setBrief = useTryStore((s) => s.setBrief);
  const setDirect = useTryStore((s) => s.setDirect);
  const { mutate: saveLook } = useSaveLook();
  const { mutate: unsaveLook } = useUnsaveLook();
  const [liked, setLiked] = useState(false);
  // Effective saved state = server membership unless toggled this session (optimistic).
  const [override, setOverride] = useState<boolean | null>(null);
  const isSaved = override ?? (card.image_url ? savedImages.has(card.image_url) : false);

  const onSave = () => {
    if (!session) {
      toast(lang === 'fr' ? 'Connecte-toi pour garder tes mèches.' : 'Sign in to keep your looks.');
      return;
    }
    if (isSaved) {
      if (card.image_url) unsaveLook({ userId: session.user.id, imageUrl: card.image_url });
      setOverride(false);
      toast(lang === 'fr' ? 'Retiré de Mes mèches.' : 'Removed from My looks.');
    } else {
      // Saved from the feed → "Enregistrées" (no generation_id), with the real feed photo.
      saveLook({ userId: session.user.id, name: card.name[lang], hair: card.hair, mood: card.mood, tag: card.kind, imageUrl: card.image_url ?? undefined });
      setOverride(true);
      toast(lang === 'fr' ? 'Enregistré dans Mes mèches.' : 'Saved to My looks.');
    }
  };

  const tryThis = () => {
    setBrief({ lookName: card.name[lang], prompt: card.descr?.[lang] });
    setDirect(true); // specific look → skip "Ton idée"
    router.push('/try');
  };

  const rail = [
    { ic: 'heart' as const, label: card.loves ?? '', on: liked, onPress: () => setLiked((v) => !v) },
    { ic: 'bookmark' as const, label: isSaved ? (lang === 'fr' ? 'Gardé' : 'Saved') : lang === 'fr' ? 'Garder' : 'Keep', on: isSaved, onPress: onSave },
  ];

  return (
    <View style={{ height, width: '100%', backgroundColor: '#000' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1a1512' }}>
        {card.image_url ? (
          <Image source={{ uri: card.image_url }} style={{ flex: 1 }} contentFit="cover" transition={200} />
        ) : (
          <MPortrait hair={card.hair} mood={card.mood} tint={MPAL.ink} />
        )}
      </View>
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'transparent', 'transparent', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.2, 0.5, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />

      {/* swipe hint */}
      <View style={{ position: 'absolute', right: 14, top: insetsTop + 70, alignItems: 'center', gap: 4, opacity: 0.55 }}>
        <MIcon name="arrowUp" size={13} color="#fff" />
      </View>

      {/* right action rail */}
      <View style={{ position: 'absolute', right: 14, bottom: 230, gap: 16 }}>
        {rail.map((a, i) => (
          <Pressable key={i} onPress={a.onPress} style={{ alignItems: 'center', gap: 4 }}>
            <BlurView intensity={30} tint="dark" style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
              <MIcon name={a.ic} size={20} color={a.on ? MPAL.sable : '#fff'} fill={a.on ? MPAL.sable : 'none'} stroke={a.on ? 0 : 1.7} />
            </BlurView>
            <MText variant="bodySemibold" size={11} color="#fff">
              {a.label}
            </MText>
          </Pressable>
        ))}
      </View>

      {/* bottom content card */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 130, paddingHorizontal: 18 }}>
        {/* source pill */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingLeft: 6, paddingRight: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', marginBottom: 12 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: meta.tint, alignItems: 'center', justifyContent: 'center' }}>
            <MIcon name={meta.icon} size={12} color="#fff" fill={card.kind === 'studio' ? '#fff' : 'none'} stroke={card.kind === 'studio' ? 0 : 1.8} />
          </View>
          <View>
            <MText variant="mono" size={9} color="#fff" style={{ letterSpacing: 1.2 }}>
              · {card.label?.[lang] ?? ''}
            </MText>
            <MText size={10} color="rgba(255,255,255,0.7)">
              {card.by?.[lang] ?? ''}
            </MText>
          </View>
        </View>

        <MText variant="serif" size={32} color="#fff" style={{ lineHeight: 34 }}>
          {card.name[lang]}
        </MText>
        {card.descr ? (
          <MText size={13} color="rgba(255,255,255,0.85)" style={{ marginTop: 4, maxWidth: 280 }}>
            {card.descr[lang]}
          </MText>
        ) : null}

        {/* per-source CTA row */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Pressable
            onPress={tryThis}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 999, backgroundColor: '#fff' }}
          >
            <MIcon name="sparkle" size={15} color={MPAL.ink} />
            <MText variant="bodySemibold" size={14} color={MPAL.ink}>
              {lang === 'fr' ? 'Essayer ce look' : 'Try this look'}
            </MText>
          </Pressable>
          {card.kind === 'salon' ? (
            <Pressable onPress={() => router.push('/salons')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 999, backgroundColor: MPAL.ink }}>
              <MIcon name="pin" size={14} color="#fff" />
              <MText variant="bodySemibold" size={13} color="#fff">
                {lang === 'fr' ? 'Réserver' : 'Book'}
              </MText>
            </Pressable>
          ) : card.kind === 'user' ? (
            <Pressable onPress={() => toast(lang === 'fr' ? 'Les profils publics arrivent bientôt.' : 'Public profiles are coming soon.', { icon: 'sparkle' })} style={{ paddingHorizontal: 16, paddingVertical: 13, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' }}>
              <MText variant="bodySemibold" size={13} color="#fff">
                {lang === 'fr' ? 'Voir profil' : 'See profile'}
              </MText>
            </Pressable>
          ) : null /* studio: save lives in the right rail under the like — no duplicate here */}
        </View>
      </View>
    </View>
  );
}

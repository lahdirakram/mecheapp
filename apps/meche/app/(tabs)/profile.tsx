import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import { useAuth, useBookings, useCredits, useCreditPacks, useProfile, useSession, useSignedUrls, useWardrobe } from '@meche/api-client';
import type { HairShape, PortraitMood } from '@meche/core';
import { MIcon, MPAL, MText, MPortrait, type MIconName, useLangStore, useSheet, useT, useToast } from '@meche/ui';

type Look = { id: string; name: string; hair: HairShape; mood: PortraitMood; image_url?: string | null; generation_id?: string | null };

// B2C · Profil & crédits (20) — identity, AI-credit balance (no subscription), recent tries,
// settings. Ported from MScreenProfile. Recharge + sign-out + language kept functional.
export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const { lang, toggle } = useLangStore();
  const toast = useToast();
  const sheet = useSheet();
  const session = useSession();
  const { signOut } = useAuth();
  const { data: profile } = useProfile(session?.user.id);
  const { data: credits } = useCredits(session?.user.id);
  const { data: looksData } = useWardrobe(session?.user.id);
  const { data: bookings } = useBookings();
  // Cheapest pack drives the "from" price so it tracks the real ladder (packs come ordered by credits asc).
  const { data: packs } = useCreditPacks();
  const fromPrice = ((packs as { price: string }[] | undefined) ?? [])[0]?.price;

  const name = profile?.display_name || session?.user.email?.split('@')[0] || (lang === 'fr' ? 'Toi' : 'You');
  const handle = profile?.handle || session?.user.email || '';
  const since = profile?.member_since;
  const upcoming = ((bookings as { starts_at: string }[] | undefined) ?? []).filter((b) => new Date(b.starts_at).getTime() > Date.now()).length;
  // "Tes derniers essais" = AI generations only (not feed-saved inspiration photos).
  const recent = ((looksData as Look[] | undefined) ?? []).filter((w) => w.generation_id).slice(0, 4);
  // Generated images are private paths → sign; feed photos are external URLs (pass through).
  const { data: signed = {} } = useSignedUrls('generated', useMemo(() => recent.map((w) => w.image_url), [recent]));
  const srcOf = (u?: string | null) => (!u ? undefined : /^https?:\/\//.test(u) ? u : signed[u]);

  const soon = (title: string) => toast(lang === 'fr' ? `${title} arrive bientôt.` : `${title} is coming soon.`, { icon: 'sparkle' });
  const openPrefs = () =>
    sheet({
      title: lang === 'fr' ? 'Préférences' : 'Preferences',
      options: [
        { label: lang === 'fr' ? `Langue : ${lang.toUpperCase()} · changer` : `Language: ${lang.toUpperCase()} · switch`, onPress: toggle },
        { label: lang === 'fr' ? 'Se déconnecter' : 'Sign out', destructive: true, onPress: () => void signOut() },
        { label: lang === 'fr' ? 'Fermer' : 'Close', cancel: true },
      ],
    });

  const rows: { ic: MIconName; l: string; sub: string; onPress?: () => void }[] = [
    {
      ic: 'calendar',
      l: lang === 'fr' ? 'Mes rendez-vous' : 'My appointments',
      sub: upcoming > 0 ? (lang === 'fr' ? `${upcoming} à venir` : `${upcoming} upcoming`) : lang === 'fr' ? 'Aucun à venir' : 'None upcoming',
      onPress: () => soon(lang === 'fr' ? 'Mes rendez-vous' : 'My appointments'),
    },
    { ic: 'heart', l: lang === 'fr' ? 'Salons favoris' : 'Favorite salons', sub: '', onPress: () => soon(lang === 'fr' ? 'Salons favoris' : 'Favorite salons') },
    { ic: 'settings', l: lang === 'fr' ? 'Préférences' : 'Preferences', sub: lang === 'fr' ? 'Langue, notifications' : 'Language, notifications', onPress: openPrefs },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 }}>
        <MText variant="serif" size={30}>
          {t('profile')}
        </MText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* identity */}
        <View style={{ marginTop: 8, marginBottom: 18 }}>
          <MText variant="serif" size={26}>
            {name}
          </MText>
          {handle ? (
            <MText size={13} color={MPAL.mute} style={{ marginTop: 4 }} numberOfLines={1} ellipsizeMode="tail">
              {handle}
            </MText>
          ) : null}
          {since ? (
            <MText size={12} color={MPAL.mute} style={{ marginTop: 2 }}>
              {t('member_since')} {since}
            </MText>
          ) : null}
        </View>

        {/* credits card */}
        <View style={{ padding: 18, borderRadius: 18, backgroundColor: MPAL.ink, overflow: 'hidden', marginBottom: 14 }}>
          <View style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: `${MPAL.sable}40` }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MIcon name="coin" size={16} color={MPAL.sable} />
            <MText variant="mono" size={10} color={MPAL.sable} style={{ letterSpacing: 1.8 }}>
              {lang === 'fr' ? 'CRÉDITS IA' : 'AI CREDITS'}
            </MText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <MText variant="serif" size={56} color="#fff" style={{ lineHeight: 56 }}>
              {credits ?? 0}
            </MText>
            <MText size={14} color="rgba(255,255,255,0.6)">
              {t('credits_left')}
            </MText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <Pressable onPress={() => router.push('/recharge')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: MPAL.sable }}>
              <MIcon name="zap" size={14} color={MPAL.sableInk} fill={MPAL.sableInk} stroke={0} />
              <MText variant="bodySemibold" size={13} color={MPAL.sableInk}>
                {t('recharge')}
              </MText>
            </Pressable>
            <MText size={11} color="rgba(255,255,255,0.55)" style={{ flex: 1, lineHeight: 15 }}>
              {fromPrice ? (lang === 'fr' ? `À partir de ${fromPrice} · sans abonnement` : `From ${fromPrice} · no subscription`) : lang === 'fr' ? 'Sans abonnement' : 'No subscription'}
            </MText>
          </View>
        </View>

        {/* recent tries — only when the user has looks */}
        {recent.length > 0 ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.4 }}>
                {lang === 'fr' ? 'TES DERNIERS ESSAIS' : 'YOUR RECENT TRIES'}
              </MText>
              <Pressable hitSlop={12} onPress={() => router.push('/(tabs)/wardrobe')}>
                <MText size={12} color={MPAL.mute}>
                  {lang === 'fr' ? 'Tout voir' : 'See all'}
                </MText>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
              {recent.map((w, i) => (
            <Pressable
              key={w.id}
              onPress={() =>
                w.generation_id
                  ? router.push({ pathname: '/try/result', params: { generationId: w.generation_id, lookId: w.id, name: w.name, after: w.image_url ?? '' } })
                  : router.navigate({ pathname: '/(tabs)/explore', params: { focus: w.image_url ?? w.name, t: String(Date.now()) } })
              }
              style={{ width: 100, borderRadius: 14, overflow: 'hidden', backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border }}
            >
              <View style={{ aspectRatio: 3 / 4 }}>
                {srcOf(w.image_url) ? (
                  <Image source={{ uri: srcOf(w.image_url) }} style={{ flex: 1 }} contentFit="cover" transition={150} />
                ) : (
                  <MPortrait hair={w.hair} mood={w.mood} tint={i % 3 === 0 ? MPAL.ink : undefined} />
                )}
              </View>
              <MText variant="bodySemibold" size={10} numberOfLines={1} style={{ padding: 8 }}>
                {w.name}
              </MText>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* settings */}
        <View style={{ marginTop: 14, borderRadius: 16, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border }}>
          {rows.map((r, i) => (
            <Pressable key={i} onPress={r.onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: MPAL.border }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: MPAL.subtle, alignItems: 'center', justifyContent: 'center' }}>
                <MIcon name={r.ic} size={16} color={MPAL.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <MText variant="bodySemibold" size={13}>
                  {r.l}
                </MText>
                {r.sub ? (
                  <MText size={11} color={MPAL.mute} style={{ marginTop: 1 }}>
                    {r.sub}
                  </MText>
                ) : null}
              </View>
              <MIcon name="chevronRight" size={16} color={MPAL.mute} />
            </Pressable>
          ))}
        </View>

        <Pressable hitSlop={12} onPress={signOut}>
          <MText size={13} color={MPAL.mute} style={{ textAlign: 'center', marginTop: 18, textDecorationLine: 'underline' }}>
            {lang === 'fr' ? 'Se déconnecter' : 'Sign out'}
          </MText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

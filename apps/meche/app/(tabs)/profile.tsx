import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, useBookings, useCreditPacks, useCreditSummary, useLockedFirstTry, usePendingLocked, useProfile, useSession, useWardrobe } from '@meche/api-client';
import type { HairShape, PortraitMood } from '@meche/core';
import { MIcon, MPAL, MText, MPortrait, type MIconName, useLangStore, useSheet, useT, useToast } from '@meche/ui';
import { getPushEnabled } from '../../lib/notifPref';
import { getAdConsent, recordConsent, setAdConsent, type AdConsent } from '../../lib/consent';
import { setPushPreference } from '../../lib/push';
import { openLegal } from '../../lib/legal';
import { openStoreListing } from '../../lib/review';
import { cacheKeyFor } from '../../lib/img';
import { useLocalImages } from '../../lib/localImages';

type Look = { id: string; name: string; hair: HairShape; mood: PortraitMood; image_url?: string | null; generation_id?: string | null; generation?: { status?: string; locked?: boolean; thumb_path?: string | null } | null };

// B2C · Profil & crédits (20) — identity, AI-credit balance (no subscription), recent tries,
// settings. Ported from MScreenProfile. Recharge + sign-out + language kept functional.
export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const { lang, setLang } = useLangStore();
  const toast = useToast();
  const sheet = useSheet();
  const session = useSession();
  const { signOut, deleteAccount } = useAuth();
  const [pushOn, setPushOn] = useState(true);
  const [adConsent, setAdConsentState] = useState<AdConsent | null>(null);
  useEffect(() => {
    void getPushEnabled().then(setPushOn);
    void getAdConsent().then(setAdConsentState);
  }, []);
  const togglePush = (v: boolean) => {
    setPushOn(v); // optimistic
    if (session) void setPushPreference(v);
  };
  const { data: profile } = useProfile(session?.user.id);
  // Locked first try ON → the credit vocabulary only exists AFTER the first purchase (see the card
  // below); until then the card tells the user where they are in the journey. Flag OFF → classic
  // credit card with the full balance, switched by the same app_config row that drives the server.
  const { on: lockedFirstTry, ready: flagReady } = useLockedFirstTry();
  const { data: creditSummary } = useCreditSummary(session?.user.id);
  const { data: waiting } = usePendingLocked(session?.user.id);
  // Tabs stay mounted while the try flow runs in a modal above them, so this screen's queries are
  // never remounted and would keep serving what they read BEFORE the try. Refresh on every focus:
  // the card states (first try / try waiting / credits) are exactly the things that change while
  // the user is away from this tab. Invalidating 'credits' also covers the free/paid summary,
  // whose key is prefixed with it.
  const qc = useQueryClient();
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['pendinglocked'] });
      qc.invalidateQueries({ queryKey: ['credits'] });
    }, [qc]),
  );
  const credits = lockedFirstTry ? creditSummary?.paid : creditSummary?.total;
  const preFirstPurchase = lockedFirstTry && (creditSummary?.paid ?? 0) === 0;
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
  // Generated images are private paths → resolve to a durable local file (downloaded once, then served
  // from disk with zero egress); feed photos are external URLs (pass through).
  // 100px-wide strip → the 420px thumbnail, never the full result (see wardrobe for the rationale).
  const gridPath = (l: Look) => l.generation?.thumb_path ?? l.image_url;
  const { data: local = {}, pending: imgPending } = useLocalImages('generated', useMemo(() => recent.map(gridPath), [recent]));
  const srcOf = (u?: string | null) => (!u ? undefined : /^https?:\/\//.test(u) ? u : local[u]);
  // A storage image still downloading → loader, not the "no image" illustration.
  const imgLoading = (u?: string | null) => !!u && !/^https?:\/\//.test(u) && imgPending.has(u);

  const soon = (title: string) => toast(lang === 'fr' ? `${title} arrive bientôt.` : `${title} is coming soon.`, { icon: 'sparkle' });
  // Two-step + visually distinct: only "delete" is destructive (red) and it opens its own confirm,
  // so it can't be mistaken for the harmless "sign out".
  const onDeleteAccount = () =>
    sheet({
      title: lang === 'fr' ? 'Supprimer ton compte ?' : 'Delete your account?',
      message:
        lang === 'fr'
          ? 'Tes essais, photos et crédits seront définitivement supprimés. Action irréversible.'
          : 'Your tries, photos and credits will be permanently deleted. This cannot be undone.',
      // Placement inverted vs the Account menu: the safe "Cancel" is on top, the destructive button
      // is moved to the bottom so a reflex double-tap can't confirm deletion.
      options: [
        { label: lang === 'fr' ? 'Annuler' : 'Cancel', cancel: true },
        {
          label: lang === 'fr' ? 'Supprimer définitivement' : 'Delete permanently',
          destructive: true,
          onPress: async () => {
            try {
              await deleteAccount();
            } catch {
              toast(lang === 'fr' ? 'Suppression impossible, réessaie.' : 'Could not delete, try again.');
            }
          },
        },
      ],
    });

  // Language is its OWN row, not a line inside a generic "Preferences" sheet. It used to be three
  // taps deep behind a label that never named a language, which is why testers reported the app as
  // French-only with no setting: an English speaker cannot read their way to a setting written in
  // the language they are trying to escape. Hence the always-English "Language" on the row itself
  // and the endonyms below, both readable whichever side you are stuck on.
  const openLang = () =>
    sheet({
      title: 'Langue · Language',
      options: [
        // Named choices, not a blind toggle: the sheet says what you are switching TO, and the
        // current one is marked rather than hidden.
        { label: `Français${lang === 'fr' ? ' ·' : ''}`, onPress: () => setLang('fr') },
        { label: `English${lang === 'en' ? ' ·' : ''}`, onPress: () => setLang('en') },
        { label: lang === 'fr' ? 'Fermer' : 'Close', cancel: true },
      ],
    });

  const openNotifs = () =>
    sheet({
      title: lang === 'fr' ? 'Notifications' : 'Notifications',
      options: [
        {
          label: pushOn ? (lang === 'fr' ? 'Désactiver' : 'Turn off') : lang === 'fr' ? 'Activer' : 'Turn on',
          onPress: () => togglePush(!pushOn),
        },
        { label: lang === 'fr' ? 'Fermer' : 'Close', cancel: true },
      ],
    });

  // The withdraw path the consent card promises ("modifiable à tout moment"). Granting here also
  // starts the ad SDKs live (marketing.ts listens on the consent store), no restart needed. Every
  // change appends a row to the consent_events ledger (0040): a withdrawal is proof too.
  const changeAdConsent = (c: AdConsent) => {
    setAdConsentState(c);
    void setAdConsent(c);
    if (session) recordConsent(session.user.id, 'profile', lang, [{ purpose: 'ads', status: c }]);
  };
  const openAdConsent = () =>
    sheet({
      title: lang === 'fr' ? 'Mesure et publicité' : 'Measurement and ads',
      message:
        lang === 'fr'
          ? 'Partager des mesures anonymisées avec Google, Meta et TikTok pour savoir quelles pubs font découvrir Mèche.'
          : 'Share anonymized measurements with Google, Meta and TikTok to know which ads bring people to Mèche.',
      options: [
        {
          label: `${lang === 'fr' ? 'Accepter' : 'Accept'}${adConsent === 'granted' ? ' ·' : ''}`,
          onPress: () => changeAdConsent('granted'),
        },
        {
          label: `${lang === 'fr' ? 'Refuser' : 'Refuse'}${adConsent === 'denied' ? ' ·' : ''}`,
          onPress: () => changeAdConsent('denied'),
        },
        { label: lang === 'fr' ? 'Fermer' : 'Close', cancel: true },
      ],
    });

  const openLegalSheet = () =>
    sheet({
      title: lang === 'fr' ? 'Confidentialité & CGU' : 'Privacy & Terms',
      options: [
        { label: lang === 'fr' ? 'Politique de confidentialité' : 'Privacy Policy', onPress: () => openLegal('privacy', lang) },
        { label: lang === 'fr' ? "Conditions d'utilisation" : 'Terms of Service', onPress: () => openLegal('terms', lang) },
        { label: lang === 'fr' ? 'Mentions légales' : 'Legal Notice', onPress: () => openLegal('mentions-legales', lang) },
        { label: lang === 'fr' ? 'Fermer' : 'Close', cancel: true },
      ],
    });

  // Account = sign out (normal) + delete (red, with its own confirm). Separate menu so a destructive
  // tap is never adjacent to a preference.
  const openAccount = () =>
    sheet({
      title: lang === 'fr' ? 'Compte' : 'Account',
      options: [
        { label: lang === 'fr' ? 'Se déconnecter' : 'Sign out', onPress: () => void signOut() },
        { label: lang === 'fr' ? 'Supprimer mon compte' : 'Delete my account', destructive: true, onPress: onDeleteAccount },
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
    // Bilingual label on purpose — see openLang.
    { ic: 'compass', l: 'Langue · Language', sub: lang === 'fr' ? 'Français' : 'English', onPress: openLang },
    {
      ic: 'settings',
      l: lang === 'fr' ? 'Notifications' : 'Notifications',
      sub: lang === 'fr' ? (pushOn ? 'Activées' : 'Désactivées') : pushOn ? 'On' : 'Off',
      onPress: openNotifs,
    },
    // Explicit rating entry point. This one goes to the STORE LISTING, never to the native prompt:
    // Apple's guidelines forbid wiring SKStoreReviewController to a button, and the native prompt
    // is already fired from the reveal (lib/review.ts).
    { ic: 'star', l: lang === 'fr' ? 'Noter Mèche' : 'Rate Mèche', sub: lang === 'fr' ? 'Laisser un avis sur le store' : 'Leave a review on the store', onPress: () => void openStoreListing() },
    {
      ic: 'zap',
      l: lang === 'fr' ? 'Mesure et publicité' : 'Measurement and ads',
      sub: adConsent === 'granted' ? (lang === 'fr' ? 'Activée' : 'On') : lang === 'fr' ? 'Désactivée' : 'Off',
      onPress: openAdConsent,
    },
    { ic: 'lock', l: lang === 'fr' ? 'Confidentialité & CGU' : 'Privacy & Terms', sub: lang === 'fr' ? 'Politique, CGU, mentions légales' : 'Policy, Terms, Legal notice', onPress: openLegalSheet },
    { ic: 'user', l: lang === 'fr' ? 'Compte' : 'Account', sub: lang === 'fr' ? 'Déconnexion, suppression' : 'Sign out, delete', onPress: openAccount },
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

        {/* The card carries the ONE thing that matters right now. Before the first purchase that is
            the journey (your try is waiting / start your first try), never a credit count — a "0"
            next to a working app reads as broken, and a "1" promised a clear result the welcome
            credit doesn't buy. Credits appear once they exist as bought credits. */}
        <View style={{ padding: 18, borderRadius: 18, backgroundColor: MPAL.ink, overflow: 'hidden', marginBottom: 14 }}>
          <View style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: `${MPAL.sable}40` }} />
          {!flagReady ? (
            // Which card this is depends on a server flag. Hold the space rather than guess: the
            // wrong guess either hides a paying customer's credits or promises a new user one.
            <View style={{ height: 116, alignItems: 'flex-start', justifyContent: 'center' }}>
              <ActivityIndicator color={MPAL.sable} />
            </View>
          ) : preFirstPurchase ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <MIcon name="sparkle" size={16} color={MPAL.sable} />
                <MText variant="mono" size={10} color={MPAL.sable} style={{ letterSpacing: 1.8 }}>
                  {waiting ? t('profile_waiting_title') : t('profile_first_title')}
                </MText>
              </View>
              <MText size={14} color="rgba(255,255,255,0.85)" style={{ lineHeight: 20 }}>
                {waiting ? t('profile_waiting_sub') : t('profile_first_sub')}
              </MText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
                <Pressable
                  onPress={() =>
                    waiting
                      ? router.push({ pathname: '/try/result', params: { generationId: waiting.generationId, lookId: waiting.lookId, name: waiting.name } })
                      : router.push('/try')
                  }
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: MPAL.sable }}
                >
                  <MIcon name="sparkle" size={14} color={MPAL.sableInk} />
                  <MText variant="bodySemibold" size={13} color={MPAL.sableInk}>
                    {waiting ? t('locked_cta_buy') : t('profile_first_cta')}
                  </MText>
                </Pressable>
                <MText size={11} color="rgba(255,255,255,0.55)" style={{ flex: 1, lineHeight: 15 }}>
                  {fromPrice ? (lang === 'fr' ? `À partir de ${fromPrice} · sans abonnement` : `From ${fromPrice} · no subscription`) : lang === 'fr' ? 'Sans abonnement' : 'No subscription'}
                </MText>
              </View>
            </>
          ) : (
            <>
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
            </>
          )}
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
                {srcOf(gridPath(w)) ? (
                  // Stable cacheKey (token stripped); no recyclingKey (horizontal ScrollView, no recycling).
                  // A locked try's stored image is already the blurred preview (blurred server-side),
                  // so no blurRadius here; the badge is what marks it as locked.
                  <Image source={{ uri: srcOf(gridPath(w)), cacheKey: cacheKeyFor(srcOf(gridPath(w))) }} style={{ flex: 1 }} contentFit="cover" transition={0} cachePolicy="memory-disk" />
                ) : imgLoading(gridPath(w)) ? (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={MPAL.sable} />
                  </View>
                ) : (
                  <MPortrait hair={w.hair} mood={w.mood} tint={i % 3 === 0 ? MPAL.ink : undefined} />
                )}
                {w.generation?.locked ? (
                  <View style={{ position: 'absolute', top: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)' }}>
                    <MText variant="mono" size={7} color={MPAL.ink} style={{ letterSpacing: 0.8 }}>
                      {t('locked_badge')}
                    </MText>
                  </View>
                ) : null}
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
      </ScrollView>
    </View>
  );
}

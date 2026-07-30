import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMySalon, usePortfolio, useProStatus, useSession, useSignedUrls, useWardrobe } from '@meche/api-client';
import { MIcon, MPAL, MText, PrimaryButton, useLang } from '@meche/ui';
import { cacheKeyFor } from '../../lib/img';
import { useLocalImages } from '../../lib/localImages';
import { FREE_TRIALS, MONTHLY_QUOTA } from '../../lib/quota';
import { useTryStore } from '../../lib/tryStore';

const DAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface LookRow {
  id: string;
  name: string;
  image_url: string | null;
  generation_id: string | null;
  client_name: string | null;
  created_at: string;
  generation?: { status?: string } | null;
}

// Studio · home, in the language of the original "Aujourd'hui" design: date line + serif greeting,
// a KPI strip, the dark hero card for the primary action, and the try-on history as a horizontal
// shelf. History polls while a generation runs, so cards flip to their image on their own.
export default function Studio() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lang = useLang();
  const session = useSession();
  const { data: status } = useProStatus(session?.user.id);
  const { data: salon } = useMySalon(session?.user.id);
  const { data: looks } = useWardrobe(session?.user.id);
  const stylistId = salon?.stylists?.[0]?.id as string | undefined;
  const { data: portfolio } = usePortfolio(stylistId);

  const stylistName = salon?.stylists?.[0]?.name as string | undefined;
  const subActive = status?.sub_active ?? false;
  const month = status?.month ?? 0;
  const trialLeft = Math.max(0, FREE_TRIALS - (status?.lifetime ?? 0));
  const left = subActive ? Math.max(0, MONTHLY_QUOTA - month) : trialLeft;
  const published = portfolio?.length ?? 0;

  const now = new Date();
  const dateLine =
    lang === 'fr'
      ? `${DAYS_FR[now.getDay()]} ${now.getDate()} ${MONTHS_FR[now.getMonth()]}`
      : `${DAYS_EN[now.getDay()]}, ${MONTHS_EN[now.getMonth()]} ${now.getDate()}`;

  const history = ((looks ?? []) as LookRow[]).filter((l) => l.generation_id);
  const paths = history.map((l) => l.image_url);
  const { data: localMap, pending: localPending } = useLocalImages('generated', paths);
  const { data: signedMap } = useSignedUrls('generated', paths);
  const uriFor = (p: string | null) => {
    if (!p) return null;
    if (localMap[p]) return localMap[p];
    if (localPending.has(p)) return null; // downloading — placeholder, don't double-fetch
    return signedMap?.[p] ?? null;
  };

  const timeFor = (iso: string) => {
    const d = new Date(iso);
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const start = () => {
    useTryStore.getState().reset();
    router.push('/try');
  };

  const openLook = (l: LookRow) =>
    router.push({ pathname: '/try/result', params: { generationId: l.generation_id!, lookId: l.id, name: l.name, clientName: l.client_name ?? '' } });

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* header — date + greeting, like the design's Aujourd'hui */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.6, textTransform: 'uppercase' }}>
            {dateLine}
          </MText>
          <MText variant="serif" size={32} style={{ marginTop: 6, lineHeight: 36 }}>
            {lang === 'fr' ? 'Bonjour' : 'Hello'}
            {stylistName ? (
              <MText variant="serifItalic" size={32}>
                {' '}
                {stylistName}
              </MText>
            ) : null}
            .
          </MText>
        </View>

        {/* KPI strip */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16 }}>
          <Kpi value={String(month)} label={lang === 'fr' ? 'essais ce mois' : 'try-ons this month'} />
          <Kpi value={String(published)} label={lang === 'fr' ? 'réalisations' : 'published looks'} onPress={() => router.push('/realisations')} />
          <Kpi
            value={String(left)}
            label={subActive ? (lang === 'fr' ? `sur ${MONTHLY_QUOTA} restants` : `of ${MONTHLY_QUOTA} left`) : lang === 'fr' ? 'offerts restants' : 'free left'}
            accent={!subActive && left === 0}
            onPress={subActive ? undefined : () => router.push('/paywall')}
          />
        </View>
        {subActive ? (
          <View style={{ marginHorizontal: 16, marginTop: 10, height: 4, borderRadius: 4, backgroundColor: MPAL.subtle, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.min(100, (month / MONTHLY_QUOTA) * 100)}%`, backgroundColor: MPAL.sable }} />
          </View>
        ) : (
          /* not subscribed → a real subscription CTA, not a buried footnote */
          <Pressable
            onPress={() => router.push('/paywall')}
            style={({ pressed }) => ({
              marginHorizontal: 16,
              marginTop: 12,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: 'rgba(176,127,60,0.45)',
              backgroundColor: pressed ? 'rgba(176,127,60,0.16)' : 'rgba(176,127,60,0.10)',
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            })}
          >
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: MPAL.sable, alignItems: 'center', justifyContent: 'center' }}>
              <MIcon name="crown" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <MText variant="bodySemibold" size={14}>
                {lang === 'fr' ? 'Passe à Mèche Pro' : 'Go Mèche Pro'}
              </MText>
              <MText size={12} color={MPAL.ink2} style={{ marginTop: 1 }}>
                {trialLeft > 0
                  ? lang === 'fr'
                    ? `${MONTHLY_QUOTA} essais/mois pour 29,99 €. Encore ${trialLeft} ${trialLeft > 1 ? 'essais offerts' : 'essai offert'}.`
                    : `${MONTHLY_QUOTA} try-ons/month for €29.99. ${trialLeft} free ${trialLeft > 1 ? 'try-ons' : 'try-on'} left.`
                  : lang === 'fr'
                    ? `Essais offerts épuisés. ${MONTHLY_QUOTA} essais/mois pour 29,99 €.`
                    : `Free try-ons used. ${MONTHLY_QUOTA} try-ons/month for €29.99.`}
              </MText>
            </View>
            <MIcon name="chevronRight" size={16} color={MPAL.sable} />
          </Pressable>
        )}

        {/* hero — dark card, the one action that matters */}
        <View style={{ marginHorizontal: 16, marginTop: 16, borderRadius: 22, backgroundColor: MPAL.ink, padding: 20, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(176,127,60,0.22)' }} />
          <View style={{ position: 'absolute', bottom: -70, left: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(176,127,60,0.10)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MIcon name="sparkle" size={14} color={MPAL.sable} fill={MPAL.sable} stroke={0} />
            <MText variant="mono" size={10} color={MPAL.sable} style={{ letterSpacing: 1.6 }}>
              {lang === 'fr' ? 'ESSAI MÈCHE' : 'MÈCHE TRY-ON'}
            </MText>
          </View>
          <MText variant="serif" size={26} color="#fff" style={{ marginTop: 10, lineHeight: 31 }}>
            {lang === 'fr' ? 'Montre-lui le résultat avant de couper.' : 'Show her the result before you cut.'}
          </MText>
          <MText size={13} color="rgba(255,255,255,0.65)" style={{ marginTop: 6, lineHeight: 19 }}>
            {lang === 'fr' ? 'Sa photo, son idée, le rendu sur elle en 20 secondes.' : 'Her photo, her idea, the result on her in 20 seconds.'}
          </MText>
          <View style={{ marginTop: 16 }}>
            <PrimaryButton label={lang === 'fr' ? 'Nouvelle cliente' : 'New client'} tone="caramel" icon="arrowRight" onPress={start} />
          </View>
        </View>

        {/* history shelf — or the how-it-works primer while it's empty */}
        {history.length === 0 ? (
          <View style={{ marginHorizontal: 16, marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: MPAL.border, padding: 16, gap: 14 }}>
            <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.4 }}>
              {lang === 'fr' ? 'COMMENT ÇA MARCHE' : 'HOW IT WORKS'}
            </MText>
            {(lang === 'fr'
              ? [
                  ['1', 'Prends ta cliente en photo, au fauteuil, cheveux dégagés.'],
                  ['2', 'Décris la coupe qu’elle hésite à faire, en une phrase.'],
                  ['3', 'Montre-lui le résultat sur ELLE, comparez, ajustez, coupez.'],
                ]
              : [
                  ['1', 'Photograph your client at the chair, hair visible.'],
                  ['2', 'Describe the cut she is hesitating about, in one line.'],
                  ['3', 'Show her the result on HER, compare, adjust, cut.'],
                ]
            ).map(([n, txt]) => (
              <View key={n} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: MPAL.subtle, alignItems: 'center', justifyContent: 'center' }}>
                  <MText variant="bodyBold" size={12}>
                    {n}
                  </MText>
                </View>
                <MText size={13} color={MPAL.ink2} style={{ flex: 1, lineHeight: 19 }}>
                  {txt}
                </MText>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 }}>
              <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.4 }}>
                {lang === 'fr' ? 'ESSAIS RÉCENTS' : 'RECENT TRY-ONS'}
              </MText>
              <Pressable hitSlop={10} onPress={() => router.push('/essais')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MText variant="bodySemibold" size={12} color={MPAL.ink}>
                  {lang === 'fr' ? 'Tout voir' : 'See all'}
                </MText>
                <MIcon name="chevronRight" size={12} color={MPAL.ink} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {history.slice(0, 15).map((l) => {
                const genStatus = l.generation?.status;
                const uri = genStatus === 'done' ? uriFor(l.image_url) : null;
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => (genStatus === 'done' ? openLook(l) : undefined)}
                    style={{ width: 132, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: MPAL.border, backgroundColor: MPAL.paper }}
                  >
                    <View style={{ height: 168, alignItems: 'center', justifyContent: 'center' }}>
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
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 8, gap: 2 }}>
                      <MText variant="bodySemibold" size={12} numberOfLines={1}>
                        {(l.client_name ?? '').trim() || l.name}
                      </MText>
                      <MText variant="mono" size={9} color={MPAL.mute} numberOfLines={1}>
                        {(l.client_name ?? '').trim() ? `${timeFor(l.created_at)} · ${l.name}` : timeFor(l.created_at)}
                      </MText>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* réalisations cross-link */}
        <Pressable
          onPress={() => router.push('/realisations')}
          style={({ pressed }) => ({
            marginHorizontal: 16,
            marginTop: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 15,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: MPAL.border,
            backgroundColor: pressed ? 'rgba(0,0,0,0.03)' : MPAL.paper,
          })}
        >
          <MIcon name="grid" size={18} color={MPAL.ink} />
          <View style={{ flex: 1 }}>
            <MText variant="bodySemibold" size={14}>
              {lang === 'fr' ? 'Mes réalisations' : 'My work'}
            </MText>
            <MText size={12} color={MPAL.mute}>
              {lang === 'fr'
                ? published > 0
                  ? `${published} ${published > 1 ? 'photos publiées' : 'photo publiée'} sur ta fiche`
                  : 'Ajoute les vraies photos de tes coupes'
                : published > 0
                  ? `${published} ${published > 1 ? 'photos' : 'photo'} on your page`
                  : 'Add real photos of your cuts'}
            </MText>
          </View>
          <MIcon name="chevronRight" size={16} color={MPAL.mute} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Kpi({ value, label, accent, onPress }: { value: string; label: string; accent?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: accent ? MPAL.sable : MPAL.border, backgroundColor: MPAL.paper, paddingVertical: 12, paddingHorizontal: 12 }}
    >
      <MText variant="serif" size={24} color={accent ? MPAL.sable : MPAL.ink}>
        {value}
      </MText>
      <MText size={10} color={MPAL.mute} style={{ marginTop: 2 }} numberOfLines={2}>
        {label}
      </MText>
    </Pressable>
  );
}

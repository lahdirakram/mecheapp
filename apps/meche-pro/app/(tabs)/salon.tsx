import React, { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useMySalon, usePortfolio, useProStatus, useSession } from '@meche/api-client';
import { MIcon, MPAL, MText, PrimaryButton, useLang, useLangStore, useSheet, useToast, type MIconName } from '@meche/ui';
import { supabase } from '../../lib/supabase';
import { openLegal } from '../../lib/legal';
import { useProPrice } from '../../lib/pricing';
import { FREE_TRIALS, MONTHLY_QUOTA } from '../../lib/quota';
import { PRO_PRODUCT_ID, openManageSubscription } from '../../lib/subscription';

// How many réalisations the shelf shows before "Tout voir" takes over.
const SHELF_MAX = 8;

interface ServiceRow {
  name: string;
  price_est: string | null;
}

interface PortfolioRow {
  id: string;
  image_path: string | null;
  created_at: string;
}

// Salon · la vitrine. The screen answers ONE question first — "what do my clients see, and is it
// finished?" — then handles the plan, then the account. The old version was a settings list where
// the fiche (the product's whole point) was a letter in a circle, reachable twice, with no signal
// that half its fields were empty.
export default function Salon() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lang = useLang();
  const fr = lang === 'fr';
  const price = useProPrice();
  const toggleLang = useLangStore((s) => s.toggle);
  const toast = useToast();
  const sheet = useSheet();
  const session = useSession();
  const { signOut, deleteAccount } = useAuth();
  const salonQ = useMySalon(session?.user.id);
  const statusQ = useProStatus(session?.user.id);
  const salon = salonQ.data;
  const status = statusQ.data;
  const stylist = salon?.stylists?.[0];
  const portfolioQ = usePortfolio(stylist?.id as string | undefined);

  const [refreshing, setRefreshing] = useState(false);

  // Pull to refresh: `my_pro_status` is written by the RevenueCat webhook, so right after a
  // purchase the only way to see the new state was to kill the app.
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([salonQ.refetch(), statusQ.refetch(), portfolioQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const subActive = status?.sub_active ?? false;
  const month = status?.month ?? 0;
  const trialLeft = Math.max(0, FREE_TRIALS - (status?.lifetime ?? 0));
  const periodEnd = status?.period_end ? new Date(status.period_end) : null;

  const name = (salon?.name ?? '').trim();
  const city = (salon?.city ?? salon?.area ?? '').trim();
  const phone = (salon?.phone ?? '').trim();
  const hours = (salon?.hours_text ?? '').trim();
  const bio = (salon?.bio ?? '').trim();
  const services = ((salon?.services ?? []) as ServiceRow[]).filter((s) => s.name?.trim());
  const photos = ((portfolioQ.data ?? []) as PortfolioRow[]).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));

  const editFiche = () => router.push('/salon-edit');
  const openWork = () => router.push('/realisations');

  // The portfolio bucket is public — plain public URLs, no signing (same as the Réalisations screen).
  const urlFor = (path: string | null) => (path ? supabase.storage.from('portfolio').getPublicUrl(path).data.publicUrl : null);

  // Vitrine completeness. Only the OPTIONAL fields count: `name` is set at onboarding, so counting
  // it would start everyone at 17% for free and make the meter a decoration.
  const checklist: { label: string; done: boolean; onPress: () => void }[] = [
    { label: fr ? 'Ville' : 'City', done: !!city, onPress: editFiche },
    { label: fr ? 'Téléphone' : 'Phone', done: !!phone, onPress: editFiche },
    { label: fr ? 'Horaires' : 'Hours', done: !!hours, onPress: editFiche },
    { label: fr ? 'À propos' : 'About', done: !!bio, onPress: editFiche },
    { label: fr ? 'Services' : 'Services', done: services.length > 0, onPress: editFiche },
    { label: fr ? 'Photos' : 'Photos', done: photos.length > 0, onPress: openWork },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const percent = Math.round((doneCount / checklist.length) * 100);
  const missing = checklist.filter((c) => !c.done);

  // Same legal sheet as the B2C app's profile screen: the three published documents, one tap away.
  const openLegalSheet = () =>
    sheet({
      title: fr ? 'Confidentialité & CGU' : 'Privacy & Terms',
      options: [
        { label: fr ? 'Politique de confidentialité' : 'Privacy Policy', onPress: () => openLegal('privacy', lang) },
        { label: fr ? "Conditions d'utilisation" : 'Terms of Service', onPress: () => openLegal('terms', lang) },
        { label: fr ? 'Mentions légales' : 'Legal Notice', onPress: () => openLegal('mentions-legales', lang) },
        { label: fr ? 'Fermer' : 'Close', cancel: true },
      ],
    });

  // Native OS confirmations (Alert) — validated on device, matches platform conventions.
  const confirmSignOut = () =>
    Alert.alert(fr ? 'Se déconnecter ?' : 'Sign out?', undefined, [
      { text: fr ? 'Annuler' : 'Cancel', style: 'cancel' },
      { text: fr ? 'Se déconnecter' : 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);

  const confirmDelete = () =>
    Alert.alert(
      fr ? 'Supprimer le compte ?' : 'Delete account?',
      fr ? 'Salon, réalisations et essais seront définitivement supprimés.' : 'Salon, portfolio and try-ons will be permanently deleted.',
      [
        { text: fr ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: fr ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
            } catch {
              toast(fr ? 'Suppression impossible, réessaie.' : 'Could not delete, try again.');
            }
          },
        },
      ],
    );

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={MPAL.mute} />}
      >
        {/* header — editorial, same language as the Studio tab: the salon IS the title */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.6 }}>
            {fr ? 'Ma vitrine' : 'My storefront'}
          </MText>
          <MText variant="serif" size={30} style={{ marginTop: 6, lineHeight: 34 }} numberOfLines={2}>
            {name || (fr ? 'Mon salon' : 'My salon')}
          </MText>
          {stylist?.name || city ? (
            <MText size={13} color={MPAL.mute} style={{ marginTop: 4 }} numberOfLines={1}>
              {[stylist?.name, city].filter(Boolean).join(' · ')}
            </MText>
          ) : null}
        </View>

        {/* Not subscribed → the upsell stays the first card: this is the money state, and the free
            trials run out here. Once subscribed it demotes to a compact strip below the vitrine. */}
        {!subActive ? (
          <View style={{ marginHorizontal: 16, marginTop: 18, borderRadius: 20, backgroundColor: MPAL.ink, padding: 18, overflow: 'hidden', gap: 12 }}>
            <View style={{ position: 'absolute', top: -46, right: -46, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(176,127,60,0.22)' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MIcon name="crown" size={15} color={MPAL.sable} />
              <MText variant="mono" size={10} color={MPAL.sable} style={{ letterSpacing: 1.6 }}>
                MÈCHE PRO
              </MText>
            </View>
            <MText variant="serif" size={21} color="#fff" style={{ lineHeight: 26 }}>
              {fr ? `${MONTHLY_QUOTA} essais par mois, pour chaque cliente.` : `${MONTHLY_QUOTA} try-ons a month, for every client.`}
            </MText>
            <MText size={12} color="rgba(255,255,255,0.65)">
              {trialLeft > 0
                ? fr
                  ? `Il te reste ${trialLeft} ${trialLeft > 1 ? 'essais offerts' : 'essai offert'} pour te faire une idée.`
                  : `${trialLeft} free ${trialLeft > 1 ? 'try-ons' : 'try-on'} left to make up your mind.`
                : fr
                  ? 'Tes essais offerts sont épuisés.'
                  : 'Your free try-ons are used up.'}
            </MText>
            <PrimaryButton label={fr ? `Passer à Mèche Pro · ${price}/mois` : `Go Mèche Pro · ${price}/month`} tone="caramel" icon="arrowRight" onPress={() => router.push('/paywall')} />
          </View>
        ) : null}

        {/* completeness — the one thing the old screen never said. Segmented (steps left), never a
            continuous bar: that shape is reserved for the quota below, so the two can't be confused. */}
        <View style={{ marginHorizontal: 16, marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: MPAL.border, backgroundColor: MPAL.paper, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <MText variant="serif" size={22}>
              {percent}%
            </MText>
            <MText size={13} color={MPAL.ink2} style={{ flex: 1 }}>
              {percent === 100 ? (fr ? 'Ta vitrine est complète.' : 'Your storefront is complete.') : fr ? 'Ta vitrine est presque prête.' : 'Your storefront is almost ready.'}
            </MText>
            {percent === 100 ? <MIcon name="check" size={16} color={MPAL.ink} /> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {checklist.map((c, i) => (
              <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.done ? MPAL.ink : MPAL.subtle }} />
            ))}
          </View>
          {missing.length > 0 ? (
            <>
              <MText size={12} color={MPAL.mute}>
                {fr ? 'Ce qui manque aux clientes pour te choisir :' : 'What clients still need to pick you:'}
              </MText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {missing.map((c) => (
                  <Pressable
                    key={c.label}
                    onPress={c.onPress}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: MPAL.border,
                      backgroundColor: pressed ? MPAL.subtle : MPAL.bg,
                    })}
                  >
                    <MIcon name="plus" size={12} color={MPAL.sable} />
                    <MText variant="bodyMedium" size={12}>
                      {c.label}
                    </MText>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <MText size={12} color={MPAL.mute}>
              {fr ? 'Rien à ajouter. Garde tes photos à jour, c’est ce qui se regarde en premier.' : 'Nothing to add. Keep your photos fresh, that is what gets looked at first.'}
            </MText>
          )}
        </View>

        {/* the vitrine itself — rendered the way a client reads it, not as a settings row. This is
            the ONLY entry to /salon-edit now (it used to be reachable twice, at equal weight). */}
        <SectionLabel text={fr ? 'Ce que voient tes clientes' : 'What your clients see'} />
        <Pressable
          onPress={editFiche}
          style={({ pressed }) => ({
            marginHorizontal: 16,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: MPAL.border,
            backgroundColor: pressed ? MPAL.subtle : MPAL.paper,
            padding: 16,
            gap: 14,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: MPAL.ink, alignItems: 'center', justifyContent: 'center' }}>
              <MText variant="serif" size={19} color="#fff">
                {(name || 'M').slice(0, 1).toUpperCase()}
              </MText>
            </View>
            <View style={{ flex: 1 }}>
              <MText variant="serif" size={18} numberOfLines={1}>
                {name}
              </MText>
              <MText size={12} color={MPAL.mute} numberOfLines={1}>
                {[stylist?.name, city].filter(Boolean).join(' · ') || (fr ? 'Ajoute ta ville' : 'Add your city')}
              </MText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MText variant="bodySemibold" size={12} color={MPAL.ink}>
                {fr ? 'Modifier' : 'Edit'}
              </MText>
              <MIcon name="chevronRight" size={14} color={MPAL.ink} />
            </View>
          </View>

          {bio ? (
            <MText size={13} color={MPAL.ink2} style={{ lineHeight: 19 }} numberOfLines={3}>
              {bio}
            </MText>
          ) : null}

          {/* only what is actually filled: a card full of "non renseigné" is not a preview, and the
              meter above already owns the gaps */}
          {hours || phone ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {hours ? <Fact icon="calendar" text={hours} /> : null}
              {phone ? <Fact icon="mail" text={phone} /> : null}
            </View>
          ) : null}

          {services.length > 0 ? (
            <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: MPAL.border, paddingTop: 12 }}>
              {services.slice(0, 3).map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MText size={13} color={MPAL.ink2} style={{ flex: 1 }} numberOfLines={1}>
                    {s.name}
                  </MText>
                  {s.price_est?.trim() ? (
                    <MText variant="bodySemibold" size={13} color={MPAL.ink}>
                      {s.price_est.trim()}
                    </MText>
                  ) : null}
                </View>
              ))}
              {services.length > 3 ? (
                <MText variant="mono" size={9} color={MPAL.mute}>
                  {fr ? `+ ${services.length - 3} autres services` : `+ ${services.length - 3} more services`}
                </MText>
              ) : null}
            </View>
          ) : null}
        </Pressable>

        {/* réalisations — a photo gallery deserves photos, not a text row with a chevron */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 22, marginBottom: 10 }}>
          <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.4 }}>
            {fr ? 'Mes réalisations' : 'My work'}
            {photos.length > 0 ? ` · ${photos.length}` : ''}
          </MText>
          <Pressable hitSlop={10} onPress={openWork} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MText variant="bodySemibold" size={12} color={MPAL.ink}>
              {photos.length > 0 ? (fr ? 'Gérer' : 'Manage') : fr ? 'Ajouter' : 'Add'}
            </MText>
            <MIcon name="chevronRight" size={12} color={MPAL.ink} />
          </Pressable>
        </View>
        {photos.length === 0 ? (
          <Pressable
            onPress={openWork}
            style={({ pressed }) => ({
              marginHorizontal: 16,
              borderRadius: 18,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: MPAL.border,
              backgroundColor: pressed ? MPAL.subtle : 'transparent',
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            })}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: MPAL.subtle, alignItems: 'center', justifyContent: 'center' }}>
              <MIcon name="image" size={18} color={MPAL.mute} />
            </View>
            <View style={{ flex: 1 }}>
              <MText variant="bodySemibold" size={14}>
                {fr ? 'Aucune photo pour l’instant' : 'No photos yet'}
              </MText>
              <MText size={12} color={MPAL.mute} style={{ marginTop: 1 }}>
                {fr ? 'De vraies photos de tes coupes, jamais un rendu IA.' : 'Real photos of your cuts, never an AI render.'}
              </MText>
            </View>
            <MIcon name="plus" size={16} color={MPAL.ink} />
          </Pressable>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {photos.slice(0, SHELF_MAX).map((p) => {
              const uri = urlFor(p.image_path);
              return (
                <Pressable key={p.id} onPress={openWork} style={{ width: 104, aspectRatio: 3 / 4, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: MPAL.border, backgroundColor: MPAL.subtle }}>
                  {uri ? <Image source={{ uri }} style={{ flex: 1 }} contentFit="cover" transition={150} cachePolicy="memory-disk" /> : null}
                </Pressable>
              );
            })}
            <Pressable
              onPress={openWork}
              style={{ width: 104, aspectRatio: 3 / 4, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: MPAL.border, alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <MIcon name="plus" size={18} color={MPAL.mute} />
              <MText variant="mono" size={9} color={MPAL.mute}>
                {fr ? 'Ajouter' : 'Add'}
              </MText>
            </Pressable>
          </ScrollView>
        )}

        {/* plan — canonical here (Studio only teases it). Subscribers get the quota + the store
            link inline, so "Gérer mon abonnement" no longer needs its own settings row. */}
        {subActive ? (
          <>
            <SectionLabel text={fr ? 'Mon abonnement' : 'My plan'} />
            <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: MPAL.border, backgroundColor: MPAL.paper, overflow: 'hidden' }}>
              <Pressable onPress={() => router.push('/paywall')} style={({ pressed }) => ({ padding: 16, gap: 12, backgroundColor: pressed ? MPAL.subtle : 'transparent' })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: MPAL.sable, alignItems: 'center', justifyContent: 'center' }}>
                    <MIcon name="crown" size={16} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <MText variant="bodySemibold" size={14}>
                      Mèche Pro
                    </MText>
                    <MText size={12} color={MPAL.mute}>
                      {periodEnd ? `${fr ? 'Actif · renouvellement le' : 'Active · renews on'} ${periodEnd.toLocaleDateString(fr ? 'fr-FR' : 'en-US')}` : fr ? 'Actif' : 'Active'}
                    </MText>
                  </View>
                  <MIcon name="chevronRight" size={16} color={MPAL.mute} />
                </View>
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.2 }}>
                      {fr ? 'Essais ce mois' : 'Try-ons this month'}
                    </MText>
                    <MText variant="mono" size={10} color={MPAL.mute}>
                      {month} / {MONTHLY_QUOTA}
                    </MText>
                  </View>
                  <View style={{ height: 4, borderRadius: 4, backgroundColor: MPAL.subtle, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${Math.min(100, (month / MONTHLY_QUOTA) * 100)}%`, backgroundColor: MPAL.sable }} />
                  </View>
                </View>
              </Pressable>
              <Divider inset={0} />
              {/* The store screen is the only place a subscription can be changed or cancelled (no
                  app can do it itself), and it is what someone looking to cancel opens settings to
                  find. Subscribers only, so it never reads as an upsell. */}
              <Row icon="link" label={fr ? 'Gérer sur le store' : 'Manage on the store'} detail={fr ? 'Modifier, résilier' : 'Change, cancel'} onPress={() => openManageSubscription(PRO_PRODUCT_ID)} />
            </View>
          </>
        ) : null}

        {/* account — the plumbing, visually demoted below everything about the salon */}
        <SectionLabel text={fr ? 'Compte' : 'Account'} />
        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: MPAL.border, backgroundColor: MPAL.paper, overflow: 'hidden' }}>
          {/* A language switch is a toggle, not a destination: a chevron here was a lie. */}
          <Row
            icon="compass"
            label={fr ? 'Langue' : 'Language'}
            onPress={toggleLang}
            right={
              <View style={{ flexDirection: 'row', borderRadius: 999, backgroundColor: MPAL.subtle, padding: 2 }}>
                {(['fr', 'en'] as const).map((l) => (
                  <View key={l} style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, backgroundColor: lang === l ? MPAL.ink : 'transparent' }}>
                    <MText variant="bodySemibold" size={11} color={lang === l ? '#fff' : MPAL.mute}>
                      {l.toUpperCase()}
                    </MText>
                  </View>
                ))}
              </View>
            }
          />
          <Divider />
          <Row icon="lock" label={fr ? 'Confidentialité & CGU' : 'Privacy & Terms'} detail={fr ? 'Politique, CGU, mentions' : 'Policy, Terms, Legal'} onPress={openLegalSheet} />
        </View>

        {/* footer — sign out is an action (pill, no chevron), delete stays reachable but stops
            competing with "Langue" for attention */}
        <View style={{ marginTop: 26, paddingHorizontal: 16, alignItems: 'center', gap: 14 }}>
          <Pressable
            onPress={confirmSignOut}
            style={({ pressed }) => ({
              alignSelf: 'stretch',
              alignItems: 'center',
              paddingVertical: 14,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: MPAL.border,
              backgroundColor: pressed ? MPAL.subtle : 'transparent',
            })}
          >
            <MText variant="bodySemibold" size={14}>
              {fr ? 'Se déconnecter' : 'Sign out'}
            </MText>
          </Pressable>
          <Pressable hitSlop={10} onPress={confirmDelete} style={{ paddingVertical: 4 }}>
            <MText variant="bodyMedium" size={12} color={MPAL.warn}>
              {fr ? 'Supprimer mon compte' : 'Delete my account'}
            </MText>
          </Pressable>
          <MText variant="mono" size={9} color={MPAL.mute} style={{ letterSpacing: 0.8, textAlign: 'center' }} numberOfLines={1}>
            {[session?.user.email, Constants.expoConfig?.version ? `v${Constants.expoConfig.version}` : null].filter(Boolean).join('  ·  ')}
          </MText>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.4, paddingHorizontal: 20, marginTop: 22, marginBottom: 10 }}>
      {text}
    </MText>
  );
}

function Fact({ icon, text }: { icon: MIconName; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: MPAL.subtle }}>
      <MIcon name={icon} size={12} color={MPAL.ink2} />
      <MText size={12} color={MPAL.ink2} numberOfLines={1}>
        {text}
      </MText>
    </View>
  );
}

function Row({ icon, label, detail, onPress, right }: { icon: MIconName; label: string; detail?: string; onPress: () => void; right?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: pressed ? MPAL.subtle : 'transparent' })}>
      <MIcon name={icon} size={18} color={MPAL.ink} />
      <View style={{ flex: 1 }}>
        <MText variant="bodyMedium" size={15}>
          {label}
        </MText>
        {detail ? (
          <MText size={12} color={MPAL.mute} style={{ marginTop: 1 }}>
            {detail}
          </MText>
        ) : null}
      </View>
      {right ?? <MIcon name="chevronRight" size={16} color={MPAL.mute} />}
    </Pressable>
  );
}

function Divider({ inset = 46 }: { inset?: number }) {
  return <View style={{ height: 1, backgroundColor: MPAL.border, marginLeft: inset }} />;
}

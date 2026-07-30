import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useMySalon, useProStatus, useSession } from '@meche/api-client';
import { MIcon, MPAL, MText, PrimaryButton, TopBar, useLang, useLangStore, useSheet, useToast, type MIconName } from '@meche/ui';
import { openLegal } from '../../lib/legal';
import { PRO_PRODUCT_ID, openManageSubscription } from '../../lib/subscription';

// Mirrors the server's quota env (display only).
const MONTHLY_QUOTA = 100;
const FREE_TRIALS = 3;

// Salon · hub: the fiche (what B2C clients will see), the subscription front and center,
// réalisations, account.
export default function Salon() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lang = useLang();
  const toggleLang = useLangStore((s) => s.toggle);
  const toast = useToast();
  const sheet = useSheet();
  const session = useSession();
  const { signOut, deleteAccount } = useAuth();
  const { data: salon } = useMySalon(session?.user.id);
  const { data: status } = useProStatus(session?.user.id);

  const stylist = salon?.stylists?.[0];
  const subActive = status?.sub_active ?? false;
  const month = status?.month ?? 0;
  const trialLeft = Math.max(0, FREE_TRIALS - (status?.lifetime ?? 0));
  const periodEnd = status?.period_end ? new Date(status.period_end) : null;

  // Same legal sheet as the B2C app's profile screen: the three published documents, one tap away.
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

  // Native OS confirmations (Alert) — validated on device, matches platform conventions.
  const confirmSignOut = () =>
    Alert.alert(lang === 'fr' ? 'Se déconnecter ?' : 'Sign out?', undefined, [
      { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
      { text: lang === 'fr' ? 'Se déconnecter' : 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);

  const confirmDelete = () =>
    Alert.alert(
      lang === 'fr' ? 'Supprimer le compte ?' : 'Delete account?',
      lang === 'fr' ? 'Salon, réalisations et essais seront définitivement supprimés.' : 'Salon, portfolio and try-ons will be permanently deleted.',
      [
        { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'fr' ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
            } catch {
              toast(lang === 'fr' ? 'Suppression impossible, réessaie.' : 'Could not delete, try again.');
            }
          },
        },
      ],
    );

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top }}>
      <TopBar title="Salon" big />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* fiche */}
        <Pressable onPress={() => router.push('/salon-edit')} style={{ borderRadius: 18, borderWidth: 1, borderColor: MPAL.border, backgroundColor: MPAL.paper, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: MPAL.ink, alignItems: 'center', justifyContent: 'center' }}>
            <MText variant="serif" size={18} color="#fff">
              {(salon?.name ?? 'M').slice(0, 1).toUpperCase()}
            </MText>
          </View>
          <View style={{ flex: 1 }}>
            <MText variant="bodySemibold" size={15} numberOfLines={1}>
              {salon?.name ?? ''}
            </MText>
            <MText size={12} color={MPAL.mute} numberOfLines={1}>
              {[stylist?.name, salon?.city ?? salon?.area].filter(Boolean).join(' · ')}
            </MText>
          </View>
          <MIcon name="chevronRight" size={16} color={MPAL.mute} />
        </Pressable>

        {/* subscription — front and center, state-dependent */}
        {subActive ? (
          <Pressable onPress={() => router.push('/paywall')} style={({ pressed }) => ({ borderRadius: 18, borderWidth: 1, borderColor: MPAL.border, backgroundColor: pressed ? 'rgba(0,0,0,0.02)' : MPAL.paper, padding: 16, gap: 10 })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: MPAL.sable, alignItems: 'center', justifyContent: 'center' }}>
                <MIcon name="crown" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <MText variant="bodySemibold" size={14}>
                  Mèche Pro
                </MText>
                <MText size={12} color={MPAL.mute}>
                  {periodEnd
                    ? `${lang === 'fr' ? 'Actif · renouvellement le' : 'Active · renews on'} ${periodEnd.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}`
                    : lang === 'fr'
                      ? 'Actif'
                      : 'Active'}
                </MText>
              </View>
              <MIcon name="chevronRight" size={16} color={MPAL.mute} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.2 }}>
                  {lang === 'fr' ? 'ESSAIS CE MOIS' : 'TRY-ONS THIS MONTH'}
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
        ) : (
          <View style={{ borderRadius: 20, backgroundColor: MPAL.ink, padding: 18, overflow: 'hidden', gap: 12 }}>
            <View style={{ position: 'absolute', top: -46, right: -46, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(176,127,60,0.22)' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MIcon name="crown" size={15} color={MPAL.sable} />
              <MText variant="mono" size={10} color={MPAL.sable} style={{ letterSpacing: 1.6 }}>
                MÈCHE PRO
              </MText>
            </View>
            <MText variant="serif" size={21} color="#fff" style={{ lineHeight: 26 }}>
              {lang === 'fr' ? `${MONTHLY_QUOTA} essais par mois, pour chaque cliente.` : `${MONTHLY_QUOTA} try-ons a month, for every client.`}
            </MText>
            <MText size={12} color="rgba(255,255,255,0.65)">
              {trialLeft > 0
                ? lang === 'fr'
                  ? `Il te reste ${trialLeft} ${trialLeft > 1 ? 'essais offerts' : 'essai offert'} pour te faire une idée.`
                  : `${trialLeft} free ${trialLeft > 1 ? 'try-ons' : 'try-on'} left to make up your mind.`
                : lang === 'fr'
                  ? 'Tes essais offerts sont épuisés.'
                  : 'Your free try-ons are used up.'}
            </MText>
            <PrimaryButton label={lang === 'fr' ? 'Passer à Mèche Pro · 29,99 €/mois' : 'Go Mèche Pro · €29.99/month'} tone="caramel" icon="arrowRight" onPress={() => router.push('/paywall')} />
          </View>
        )}

        <View style={{ borderRadius: 18, borderWidth: 1, borderColor: MPAL.border, overflow: 'hidden' }}>
          <Row icon="grid" label={lang === 'fr' ? 'Mes réalisations' : 'My work'} onPress={() => router.push('/realisations')} />
          <Divider />
          <Row icon="settings" label={lang === 'fr' ? 'Ma fiche salon' : 'My salon page'} onPress={() => router.push('/salon-edit')} />
        </View>

        <View style={{ borderRadius: 18, borderWidth: 1, borderColor: MPAL.border, overflow: 'hidden' }}>
          {/* Only for a subscriber: the store screen is where a subscription is changed or
              cancelled (no app can do it itself), and it is what someone looking to cancel opens
              the settings to find. Hidden otherwise so it never reads as an upsell. */}
          {subActive ? (
            <>
              <Row
                icon="crown"
                label={lang === 'fr' ? 'Gérer mon abonnement' : 'Manage my subscription'}
                detail={lang === 'fr' ? 'Modifier, résilier' : 'Change, cancel'}
                onPress={() => openManageSubscription(PRO_PRODUCT_ID)}
              />
              <Divider />
            </>
          ) : null}
          <Row
            icon="compass"
            label={lang === 'fr' ? 'Langue' : 'Language'}
            detail={lang.toUpperCase()}
            onPress={toggleLang}
          />
          <Divider />
          <Row
            icon="lock"
            label={lang === 'fr' ? 'Confidentialité & CGU' : 'Privacy & Terms'}
            detail={lang === 'fr' ? 'Politique, CGU, mentions' : 'Policy, Terms, Legal'}
            onPress={openLegalSheet}
          />
        </View>

        <View style={{ borderRadius: 18, borderWidth: 1, borderColor: MPAL.border, overflow: 'hidden' }}>
          <Row icon="x" label={lang === 'fr' ? 'Se déconnecter' : 'Sign out'} onPress={confirmSignOut} />
          <Divider />
          <Row icon="trash" label={lang === 'fr' ? 'Supprimer mon compte' : 'Delete my account'} onPress={confirmDelete} destructive />
        </View>

        <MText size={11} color={MPAL.mute} style={{ textAlign: 'center' }} numberOfLines={1}>
          {session?.user.email ?? ''}
        </MText>
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, detail, onPress, destructive }: { icon: MIconName; label: string; detail?: string; onPress: () => void; destructive?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15, backgroundColor: pressed ? 'rgba(0,0,0,0.03)' : 'transparent' })}>
      <MIcon name={icon} size={18} color={destructive ? MPAL.warn : MPAL.ink} />
      <MText variant="bodyMedium" size={15} color={destructive ? MPAL.warn : MPAL.ink} style={{ flex: 1 }}>
        {label}
      </MText>
      {detail ? (
        <MText size={12} color={MPAL.mute}>
          {detail}
        </MText>
      ) : null}
      <MIcon name="chevronRight" size={16} color={MPAL.mute} />
    </Pressable>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: MPAL.border, marginLeft: 46 }} />;
}

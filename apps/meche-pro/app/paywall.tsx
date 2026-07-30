import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useProStatus, useSession } from '@meche/api-client';
import { MIcon, MPAL, MText, PWordmark, PrimaryButton, useLang, useToast } from '@meche/ui';
import { openLegal } from '../lib/legal';
import { useProPrice } from '../lib/pricing';
import { purchaseProduct, purchasesAvailable, restorePurchases } from '../lib/purchases';
import { MONTHLY_QUOTA } from '../lib/quota';
import { PRO_PRODUCT_ID, openManageSubscription } from '../lib/subscription';

// Abonnement Mèche Pro — one plan, dark like the design's paywall. Grant happens server-side
// (RevenueCat webhook → subscriptions); this screen only opens the store sheet then refreshes.
export default function Paywall() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lang = useLang();
  const toast = useToast();
  const qc = useQueryClient();
  const session = useSession();
  const { data: status } = useProStatus(session?.user.id);
  const price = useProPrice();
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const subActive = status?.sub_active ?? false;
  const periodEnd = status?.period_end ? new Date(status.period_end) : null;

  // This screen is a NATIVE modal (presentation: 'modal' in _layout), so the root-level toast
  // renders behind it on iOS and the user sees nothing. Same constraint the action sheet already
  // documents in packages/ui/src/feedback.tsx: from a native modal, use Alert.
  const notify = (message: string) => Alert.alert(message);

  const subscribe = async () => {
    if (busy) return;
    if (!purchasesAvailable()) {
      notify(lang === 'fr' ? "L'abonnement passe par l'app installée depuis le store." : 'Subscribing requires the store-installed app.');
      return;
    }
    setBusy(true);
    const res = await purchaseProduct(PRO_PRODUCT_ID);
    setBusy(false);
    if ('ok' in res) {
      // The webhook writes the subscription row; refresh until the UI sees it. This one stays a
      // toast: router.back() dismisses the modal, so the root overlay is visible again.
      qc.invalidateQueries({ queryKey: ['prostatus'] });
      toast(lang === 'fr' ? 'Bienvenue dans Mèche Pro.' : 'Welcome to Mèche Pro.', { icon: 'sparkle' });
      router.back();
    } else if ('error' in res) {
      notify(lang === 'fr' ? 'Achat impossible, réessaie.' : 'Purchase failed, try again.');
    } else {
      // 'cancelled' — RevenueCat also reports this when StoreKit fails to present the sheet at
      // all (no sandbox account signed in, product not yet available), not only on an explicit
      // user cancel, so it is worth telling the user rather than staying silent.
      notify(lang === 'fr' ? 'Achat annulé.' : 'Purchase cancelled.');
    }
  };

  // Apple 3.1.1: a restore path must exist for a reinstall or a new device. Shown even when the
  // subscription reads as active, since that is exactly the case where the local state is wrong.
  const restore = async () => {
    if (busy || restoring) return;
    if (!purchasesAvailable()) {
      notify(lang === 'fr' ? "La restauration passe par l'app installée depuis le store." : 'Restoring requires the store-installed app.');
      return;
    }
    setRestoring(true);
    const res = await restorePurchases();
    setRestoring(false);
    if ('ok' in res) {
      // Same refresh path as subscribe: the row is written server-side, the UI just re-reads it.
      qc.invalidateQueries({ queryKey: ['prostatus'] });
      if (res.restored) notify(lang === 'fr' ? 'Abonnement restauré.' : 'Subscription restored.');
      else notify(lang === 'fr' ? 'Aucun achat à restaurer.' : 'No purchases to restore.');
    } else {
      notify(lang === 'fr' ? 'Restauration impossible, réessaie.' : 'Restore failed, try again.');
    }
  };

  const perks =
    lang === 'fr'
      ? [`${MONTHLY_QUOTA} essais au fauteuil par mois`, 'Retouches illimitées dans le quota', 'Réalisations publiées sur ta fiche', 'Visible dans l’app Mèche (bientôt)']
      : [`${MONTHLY_QUOTA} in-chair try-ons per month`, 'Refines included in the quota', 'Published looks on your page', 'Visible in the Mèche app (soon)'];

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.ink, paddingTop: insets.top + 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 }}>
        <PWordmark size={22} color="#fff" />
        <Pressable hitSlop={8} onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <MIcon name="x" size={18} color="#fff" />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <MText variant="mono" size={10} color={MPAL.sable} style={{ letterSpacing: 1.8 }}>
          MÈCHE PRO
        </MText>
        <MText variant="serif" size={34} color="#fff" style={{ marginTop: 8, lineHeight: 38 }}>
          {lang === 'fr' ? 'Le Studio, pour chaque cliente.' : 'The Studio, for every client.'}
        </MText>
        <MText size={14} color="rgba(255,255,255,0.65)" style={{ marginTop: 10, lineHeight: 21 }}>
          {lang === 'fr'
            ? 'Montre le résultat avant de couper, à chaque cliente, directement au fauteuil.'
            : 'Show the result before you cut, for every client, right at the chair.'}
        </MText>

        {/* plan card */}
        <View style={{ marginTop: 24, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 20, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <MText variant="serif" size={40} color="#fff">
              {price}
            </MText>
            <MText size={14} color="rgba(255,255,255,0.6)">
              {lang === 'fr' ? '/ mois' : '/ month'}
            </MText>
          </View>
          <View style={{ gap: 10 }}>
            {perks.map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(176,127,60,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                  <MIcon name="check" size={12} color={MPAL.sable} />
                </View>
                <MText size={14} color="rgba(255,255,255,0.85)" style={{ flex: 1 }}>
                  {p}
                </MText>
              </View>
            ))}
          </View>
        </View>

        {subActive ? (
          <View style={{ marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', padding: 16, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MIcon name="crown" size={16} color={MPAL.sable} />
              <MText variant="bodySemibold" size={14} color="#fff">
                {lang === 'fr' ? 'Abonnement actif' : 'Subscription active'}
              </MText>
            </View>
            <MText size={12} color="rgba(255,255,255,0.6)">
              {periodEnd
                ? `${lang === 'fr' ? 'Renouvellement le' : 'Renews on'} ${periodEnd.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}`
                : ''}
            </MText>
            {/* Actionable, not just informative: no app can cancel a store subscription itself, so
                a working link out to the store is the only real "cancel" we can offer. */}
            <MText
              size={12}
              color={MPAL.sable}
              style={{ textDecorationLine: 'underline' }}
              onPress={() => openManageSubscription(PRO_PRODUCT_ID)}
            >
              {lang === 'fr' ? 'Gérer ou résilier mon abonnement' : 'Manage or cancel my subscription'}
            </MText>
          </View>
        ) : (
          <View style={{ marginTop: 22, gap: 10 }}>
            <PrimaryButton label={busy ? '…' : lang === 'fr' ? 'Passer à Mèche Pro' : 'Go Mèche Pro'} tone="caramel" icon="sparkle" onPress={subscribe} disabled={busy} />
            <MText size={11} color="rgba(255,255,255,0.5)" style={{ textAlign: 'center', lineHeight: 16 }}>
              {lang === 'fr'
                ? 'Abonnement mensuel à renouvellement automatique, résiliable à tout moment dans les réglages du store. Le quota non utilisé n’est pas reporté.'
                : 'Monthly auto-renewing subscription, cancel anytime from your store settings. Unused quota does not roll over.'}
            </MText>
          </View>
        )}

        {/* Apple 3.1.1: restore, discreet but always reachable (both states) */}
        <Pressable onPress={restore} disabled={busy || restoring} hitSlop={8} style={{ marginTop: 16, alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12 }}>
          <MText size={12} color="rgba(255,255,255,0.7)" style={{ textDecorationLine: 'underline' }}>
            {restoring ? (lang === 'fr' ? 'Restauration…' : 'Restoring…') : lang === 'fr' ? 'Restaurer mes achats' : 'Restore purchases'}
          </MText>
        </Pressable>

        {/* Apple 3.1.2: functional Terms + Privacy links on the subscription screen */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 18 }}>
          <MText size={11} color="rgba(255,255,255,0.55)" style={{ textDecorationLine: 'underline' }} onPress={() => openLegal('terms', lang)}>
            {lang === 'fr' ? 'CGU' : 'Terms'}
          </MText>
          <MText size={11} color="rgba(255,255,255,0.55)" style={{ textDecorationLine: 'underline' }} onPress={() => openLegal('privacy', lang)}>
            {lang === 'fr' ? 'Politique de confidentialité' : 'Privacy Policy'}
          </MText>
        </View>
      </ScrollView>
    </View>
  );
}

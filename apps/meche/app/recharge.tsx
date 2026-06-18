import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useCreditPacks, useSession, useSupabase } from '@meche/api-client';
import { MIcon, MPAL, MText, useLang, useT, useToast } from '@meche/ui';
import { getStorePrices, purchaseProduct, purchasesAvailable, type StorePrice } from '../lib/purchases';

type Pack = { id: string; credits: number; price: string; unit: string; badge: string | null; product_id: string };

// Localized per-credit label derived from the live store price (e.g. "0,18 €"). Falls back to a
// plain "amount CUR" string on engines without Intl currency support.
function perCreditLabel(live: StorePrice, credits: number): string {
  const v = live.price / credits;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: live.currencyCode }).format(v);
  } catch {
    return `${v.toFixed(2)} ${live.currencyCode}`;
  }
}

// B2C · Recharge (15 / 10b). Credit packs, no subscription. `low=1` shows the out-of-credits
// banner (the recharge gate after the free try). Payment goes through IAP in Phase 6.
export default function Recharge() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const session = useSession();
  const sb = useSupabase();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  // May be reached via push (profile) OR via replace from the generating screen on a 402 — in the
  // latter case there's no history, so close to a safe screen instead of an unhandled GO_BACK.
  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/explore'));
  const { low } = useLocalSearchParams<{ low?: string }>();
  const lowBalance = low === '1';
  const { data } = useCreditPacks();
  const packs = (data ?? []) as Pack[];
  const [sel, setSel] = useState('star');
  // Live store prices (tax-inclusive, localized) keyed by product id. Empty until loaded / when
  // purchases are unavailable, in which case we fall back to the catalog's display price.
  const [prices, setPrices] = useState<Record<string, StorePrice>>({});
  useEffect(() => {
    void getStorePrices().then(setPrices);
  }, []);

  // Open the store sheet for the selected pack. The store confirms payment, then RevenueCat's
  // webhook grants the credits server-side — so we poll the balance until it lands.
  const buy = async () => {
    if (busy) return;
    const pack = packs.find((p) => p.id === sel);
    if (!pack) return;
    if (!purchasesAvailable()) {
      toast(lang === 'fr' ? 'Le paiement arrive bientôt.' : 'Payments are coming soon.', { icon: 'sparkle' });
      return;
    }
    setBusy(true);
    try {
      const before = ((await sb.rpc('my_credit_balance')).data as number) ?? 0;
      const r = await purchaseProduct(pack.product_id);
      if ('cancelled' in r) return;
      if ('error' in r) {
        toast(lang === 'fr' ? 'Paiement impossible. Réessaie.' : 'Purchase failed. Try again.');
        return;
      }
      // Wait for the webhook to credit the account (usually a couple of seconds).
      let credited = false;
      for (let i = 0; i < 12; i++) {
        await new Promise((res) => setTimeout(res, 1200));
        const now = ((await sb.rpc('my_credit_balance')).data as number) ?? before;
        if (now > before) {
          credited = true;
          break;
        }
      }
      qc.invalidateQueries({ queryKey: ['credits'] });
      toast(
        credited
          ? lang === 'fr'
            ? 'Crédits ajoutés. Bon essayage !'
            : 'Credits added. Have fun!'
          : lang === 'fr'
            ? 'Paiement reçu, tes crédits arrivent.'
            : 'Payment received, your credits are on the way.',
        { icon: 'sparkle' },
      );
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top + 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 18 }}>
        <Pressable hitSlop={8} onPress={close} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
          <MIcon name="x" size={18} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {lowBalance ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: MPAL.ink, marginBottom: 18 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${MPAL.sable}33`, alignItems: 'center', justifyContent: 'center' }}>
              <MIcon name="zap" size={15} color={MPAL.sable} fill={MPAL.sable} stroke={0} />
            </View>
            <MText size={12} color="#fff" style={{ flex: 1, lineHeight: 17 }}>
              <MText variant="bodyBold" size={12} color="#fff">
                {t('no_credits_title')}.{' '}
              </MText>
              {t('no_credits_sub')}
            </MText>
          </View>
        ) : null}

        <MText variant="mono" size={10} color={MPAL.ink} style={{ letterSpacing: 1.4 }}>
          ✦ CRÉDITS IA
        </MText>
        <MText variant="serif" size={32} style={{ marginTop: 6, lineHeight: 36 }}>
          {t('recharge_title')}
        </MText>
        <MText size={13} color={MPAL.mute} style={{ marginTop: 8, lineHeight: 19 }}>
          {t('recharge_sub')}
        </MText>

        <View style={{ marginTop: 18, gap: 10 }}>
          {packs.map((p) => {
            const on = sel === p.id;
            const popular = p.badge === 'popular';
            const best = p.badge === 'best';
            const live = prices[p.product_id];
            return (
              <Pressable
                key={p.id}
                onPress={() => setSel(p.id)}
                style={{
                  padding: 16,
                  borderRadius: 18,
                  backgroundColor: on ? MPAL.ink : MPAL.paper,
                  borderWidth: 1,
                  borderColor: on ? MPAL.ink : popular ? MPAL.ink : MPAL.border,
                }}
              >
                {popular || best ? (
                  <View style={{ position: 'absolute', top: -9, left: 14, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: MPAL.ink }}>
                    <MText variant="mono" size={9} color="#fff">
                      {popular ? t('most_popular') : t('best_value')}
                    </MText>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? '#fff' : MPAL.border, backgroundColor: on ? MPAL.sable : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <MIcon name="check" size={12} color="#fff" /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <MText variant="serif" size={22} color={on ? '#fff' : MPAL.ink}>
                      {p.credits}{' '}
                      <MText variant="serifItalic" size={14} color={on ? 'rgba(255,255,255,0.6)' : MPAL.mute}>
                        {t('credits')}
                      </MText>
                    </MText>
                    <MText size={11} color={on ? 'rgba(255,255,255,0.7)' : MPAL.mute} style={{ marginTop: 3 }}>
                      {live ? perCreditLabel(live, p.credits) : p.unit} {t('per_credit')}
                    </MText>
                  </View>
                  <MText variant="serif" size={22} color={on ? '#fff' : MPAL.ink}>
                    {live ? live.priceString : p.price}
                  </MText>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 18 }}>
          {['Paiement unique', 'Crédits sans expiration', 'Sans abonnement'].map((tx) => (
            <View key={tx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MIcon name="check" size={12} color={MPAL.ink} />
              <MText size={11} color={MPAL.mute}>
                {tx}
              </MText>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 16, gap: 10 }}>
        <Pressable
          onPress={buy}
          disabled={busy}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, borderRadius: 999, backgroundColor: MPAL.ink, opacity: pressed || busy ? 0.85 : 1 })}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              {Platform.OS === 'ios' ? (
                <MIcon name="apple" size={17} color="#fff" fill="#fff" stroke={0} />
              ) : (
                <MIcon name="google" size={17} />
              )}
              <MText variant="bodySemibold" size={15} color="#fff">
                {t('pay_cta')}
              </MText>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

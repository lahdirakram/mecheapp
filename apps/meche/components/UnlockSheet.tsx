import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { useCreditPacks, useCredits, useSession, useUnlockGeneration } from '@meche/api-client';
import { MIcon, MPAL, MText, useLang, useT, useToast } from '@meche/ui';
import { logEvent } from '../lib/analytics';
import { getStorePrices, type StorePrice } from '../lib/purchases';
import { useBuyPack } from '../lib/useBuyPack';

type Pack = { id: string; credits: number; price: string; unit: string; badge: string | null; product_id: string };

// The pre-purchase paywall, shown IN PLACE under the blurred result rather than on a separate
// screen: the thing being sold stays on screen while the decision is made, and there is no
// navigation to lose the user in. A pack is sold as what it delivers here ("ton résultat net +
// N essais"), not as an abstract credit count, and the 1 credit the reveal costs is already
// deducted from that N so nothing surprises the user after the purchase.
export function UnlockSheet({ generationId, onUnlocked }: { generationId: string; onUnlocked: () => void }) {
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const session = useSession();
  const { data: packs } = useCreditPacks();
  const { data: credits } = useCredits(session?.user.id);
  const { buy, busy } = useBuyPack();
  const unlockGen = useUnlockGeneration();
  const [unlocking, setUnlocking] = useState(false);
  const list = (packs ?? []) as Pack[];
  // Default to the CHEAPEST pack (packs come ordered by credits ascending): this is a first
  // purchase from someone who has not paid anything yet, so the preselected option should be the
  // lowest step, not the upsell. Any tap overrides it.
  const [picked, setSel] = useState<string | null>(null);
  const sel = picked ?? list[0]?.id ?? '';
  const [prices, setPrices] = useState<Record<string, StorePrice>>({});
  useEffect(() => {
    void getStorePrices().then(setPrices);
  }, []);
  useEffect(() => {
    void logEvent('paywall_viewed', { low_balance: 1, source: 'locked_result' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Already holding credits (bought elsewhere, or a purchase whose unlock call failed): no paywall,
  // just spend one. This is the self-healing path for a purchase that credited but didn't reveal.
  const reveal = () => {
    if (unlocking) return;
    setUnlocking(true);
    unlockGen.mutate(
      { generationId },
      {
        onSuccess: () => {
          setUnlocking(false);
          void logEvent('result_unlocked', { source: 'result_sheet' });
          onUnlocked();
        },
        onError: () => {
          setUnlocking(false);
          toast(lang === 'fr' ? 'Déblocage impossible. Réessaie.' : 'Could not unlock. Try again.');
        },
      },
    );
  };

  const onBuy = async () => {
    const pack = list.find((p) => p.id === sel);
    if (!pack) return;
    const r = await buy({ productId: pack.product_id, unlockGenerationId: generationId });
    if (r.status === 'unavailable') {
      toast(lang === 'fr' ? 'Le paiement arrive bientôt.' : 'Payments are coming soon.', { icon: 'sparkle' });
      return;
    }
    if (r.status === 'error') {
      toast(lang === 'fr' ? 'Paiement impossible. Réessaie.' : 'Purchase failed. Try again.');
      return;
    }
    if (r.status !== 'ok') return;
    if (r.unlocked) {
      void logEvent('result_unlocked', { source: 'purchase_sheet' });
      onUnlocked();
      return;
    }
    // Paid, but the reveal hasn't happened yet (webhook still in flight, or the unlock call failed).
    // The button below flips to "voir en net" as soon as the balance lands, so say exactly that.
    toast(lang === 'fr' ? 'Paiement reçu, ton résultat arrive.' : 'Payment received, your result is on the way.', { icon: 'sparkle' });
  };

  if ((credits ?? 0) > 0) {
    return (
      <View style={{ paddingHorizontal: 18, paddingTop: 14, gap: 8 }}>
        <Pressable
          onPress={reveal}
          disabled={unlocking}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 999, backgroundColor: MPAL.ink, opacity: pressed || unlocking ? 0.85 : 1 })}
        >
          {unlocking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MIcon name="sparkle" size={15} color="#fff" />
              <MText variant="bodySemibold" size={15} color="#fff">
                {t('locked_cta_unlock')}
              </MText>
            </>
          )}
        </Pressable>
      </View>
    );
  }

  const selPack = list.find((p) => p.id === sel);
  const selLive = selPack ? prices[selPack.product_id] : undefined;
  const selPrice = selLive ? selLive.priceString : selPack?.price;

  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 12, gap: 8 }}>
      <MText variant="serif" size={20} style={{ lineHeight: 24 }}>
        {t('locked_title')}
      </MText>
      {list.map((p) => {
        const on = sel === p.id;
        const live = prices[p.product_id];
        // The reveal spends 1 credit from the pack, so advertise what is LEFT after it. Promising
        // "20 essais" then showing 19 right after the purchase is exactly the kind of small lie
        // that makes the whole flow feel dishonest.
        const tries = Math.max(0, p.credits - 1);
        return (
          <Pressable
            key={p.id}
            onPress={() => setSel(p.id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, backgroundColor: on ? MPAL.ink : MPAL.paper, borderWidth: 1, borderColor: on ? MPAL.ink : MPAL.border }}
          >
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: on ? '#fff' : MPAL.border, backgroundColor: on ? MPAL.sable : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {on ? <MIcon name="check" size={9} color="#fff" /> : null}
            </View>
            <MText size={13} color={on ? '#fff' : MPAL.ink} style={{ flex: 1 }}>
              {lang === 'fr' ? `Ton résultat net + ${tries} essais` : `Your sharp result + ${tries} tries`}
            </MText>
            <MText variant="bodySemibold" size={14} color={on ? '#fff' : MPAL.ink}>
              {live ? live.priceString : p.price}
            </MText>
          </Pressable>
        );
      })}
      <Pressable
        onPress={onBuy}
        disabled={busy || !selPack}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 999, backgroundColor: MPAL.sable, opacity: pressed || busy ? 0.85 : 1, marginTop: 2 })}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <MText variant="bodySemibold" size={15} color="#fff">
            {t('locked_cta_buy')}
            {selPrice ? ` · ${selPrice}` : ''}
          </MText>
        )}
      </Pressable>
      <MText size={10} color={MPAL.mute} style={{ textAlign: 'center' }}>
        {t(Platform.OS === 'android' ? 'pay_secure_android' : 'pay_secure_ios')}
      </MText>
    </View>
  );
}

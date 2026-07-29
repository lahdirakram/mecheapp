import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase, useUnlockGeneration } from '@meche/api-client';
import { purchaseProduct, purchasesAvailable } from './purchases';

export type BuyOutcome =
  /** Store sheet unavailable (simulator, staging build, missing RC key). */
  | { status: 'unavailable' }
  | { status: 'cancelled' }
  | { status: 'error' }
  /** Paid. `credited` false = the webhook was slower than our poll (credits still land later);
   *  `unlocked` says whether the waiting result was revealed as part of this purchase. */
  | { status: 'ok'; credited: boolean; unlocked: boolean };

// One implementation of "buy a pack", shared by the recharge screen and the unlock sheet on the
// result screen — the two entry points must behave identically (poll for the webhook grant, then
// optionally spend 1 credit revealing the waiting result). Duplicating this once meant the two
// paths could drift on the part that touches money.
export function useBuyPack() {
  const sb = useSupabase();
  const qc = useQueryClient();
  const unlockGen = useUnlockGeneration();
  const [busy, setBusy] = useState(false);

  const buy = async ({ productId, unlockGenerationId }: { productId: string; unlockGenerationId?: string }): Promise<BuyOutcome> => {
    if (busy) return { status: 'cancelled' };
    if (!purchasesAvailable()) return { status: 'unavailable' };
    setBusy(true);
    try {
      const before = ((await sb.rpc('my_credit_balance')).data as number) ?? 0;
      const r = await purchaseProduct(productId);
      if ('cancelled' in r) return { status: 'cancelled' };
      if ('error' in r) return { status: 'error' };

      // The store confirmed payment; RevenueCat's webhook grants the credits server-side, so poll
      // the balance until it rises (usually a couple of seconds).
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

      // Spend 1 of those credits revealing the result the pack was bought for. Best-effort: on any
      // failure the result screen's own unlock CTA is the retry path. If the webhook was slower
      // than the poll, skip it (unlock would just 402) and let that same CTA cover it.
      let unlocked = false;
      if (credited && unlockGenerationId) {
        try {
          await unlockGen.mutateAsync({ generationId: unlockGenerationId });
          unlocked = true;
        } catch {
          /* the result screen's unlock CTA is the retry path */
        }
      }
      return { status: 'ok', credited, unlocked };
    } finally {
      setBusy(false);
    }
  };

  return { buy, busy };
}

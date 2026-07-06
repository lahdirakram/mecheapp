import { useEffect, useRef } from 'react';
import { useSession } from '@meche/api-client';
import { clearPurchaseUser, syncPurchaseUser } from './purchases';

// Keeps RevenueCat's app user id in lockstep with the Supabase session so a purchase is always
// attributed to the right account (the webhook grants credits by app_user_id). Renders nothing;
// mounted once inside <SupabaseProvider>. No-ops on web / when purchases are unavailable.
export function PurchasesSync() {
  const session = useSession();
  const last = useRef<string | null>(null);

  useEffect(() => {
    const uid = session?.user?.id ?? null;
    if (uid === last.current) return;
    last.current = uid;
    if (uid) void syncPurchaseUser(uid);
    else void clearPurchaseUser();
  }, [session?.user?.id]);

  return null;
}

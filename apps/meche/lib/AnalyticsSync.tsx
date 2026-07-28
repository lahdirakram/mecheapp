import { useEffect, useRef } from 'react';
import { useSession } from '@meche/api-client';
import { logEvent } from './analytics';

// Logs auth events to GA4 from one central place, so every method (email, confirm deep link,
// Apple, Google) is covered without touching each screen. A user whose account was created in the
// last few minutes counts as a sign_up (the ad conversion); anyone else as a login. sign_up should
// be imported "once per user" in Google Ads since a fast relaunch inside the window can repeat it.
export function AnalyticsSync() {
  const session = useSession();
  const last = useRef<string | null>(null);

  useEffect(() => {
    const uid = session?.user?.id ?? null;
    if (!uid || uid === last.current) return;
    last.current = uid;
    const createdAt = session?.user?.created_at ? Date.parse(session.user.created_at) : NaN;
    const isNew = Number.isFinite(createdAt) && Date.now() - createdAt < 5 * 60_000;
    const method = session?.user?.app_metadata?.provider ?? 'unknown';
    void logEvent(isNew ? 'sign_up' : 'login', { method });
  }, [session?.user?.id, session?.user?.created_at, session?.user?.app_metadata?.provider]);

  return null;
}

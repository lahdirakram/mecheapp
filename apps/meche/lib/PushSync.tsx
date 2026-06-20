import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useSession } from '@meche/api-client';
import { registerPushToken } from './push';

// Registers the device's push token whenever the user logs in, and routes a notification tap to
// "Mes mèches". Renders nothing; mounted once inside <SupabaseProvider> next to <PurchasesSync />.
export function PushSync() {
  const session = useSession();
  const router = useRouter();
  const last = useRef<string | null>(null);

  useEffect(() => {
    const uid = session?.user?.id ?? null;
    if (!uid || uid === last.current) return;
    last.current = uid;
    void registerPushToken(uid);
  }, [session?.user?.id]);

  // A try-on push always opens the wardrobe — the finished (or failed) look is right there.
  useEffect(() => {
    const open = (data: Record<string, unknown> | undefined) => {
      if (data?.type === 'generation') router.push('/(tabs)/wardrobe');
    };
    // Cold start: the app was launched by tapping the notification.
    void Notifications.getLastNotificationResponseAsync().then((res) => {
      if (res) open(res.notification.request.content.data);
    });
    const sub = Notifications.addNotificationResponseReceivedListener((res) => open(res.notification.request.content.data));
    return () => sub.remove();
  }, [router]);

  return null;
}

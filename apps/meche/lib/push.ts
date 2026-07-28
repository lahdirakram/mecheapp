import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { getPushEnabled, setPushEnabledPref } from './notifPref';

// Push notifications. The /generate Edge Function fires an Expo push when a background try-on lands
// in "Mes mèches" (or fails), so the user finds out even after leaving the loader / closing the app.

// Foreground behaviour: show a banner + keep it in the list, no sound/badge (it's a gentle nudge).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// getExpoPushTokenAsync needs the EAS projectId (lives in app.json → extra.eas.projectId).
const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

// Register this device's Expo push token for the SIGNED-IN user. No user argument: since 0021 the
// row is written by a security-definer RPC that derives the owner from auth.uid(), so passing an id
// would be decorative — and a decorative id is the kind of thing that later reads as a guarantee.
// Best-effort: push is a nice-to-have, so any failure (denied permission, simulator, missing
// projectId) is swallowed and never breaks the app.
export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice || !projectId) return; // simulators can't mint a token
    if (!(await getPushEnabled())) return; // user turned notifications off

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Mèche',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!granted) return;

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    // Via RPC: 0021 revoked the client's write access to `devices`, because the backend pushes to
    // whatever token it finds there with the server's Expo credentials — a client that could write
    // the table could register a THIRD PARTY's token and use us as a relay. The function derives
    // the user from auth.uid(), validates the token shape, caps the row count, and reassigns the
    // token if another account had it (a token identifies a DEVICE, not an account).
    await supabase.rpc('register_push_token', { p_token: token.data, p_platform: Platform.OS });
  } catch {
    /* non-blocking */
  }
}

// Profile toggle: persist the choice, then register (on) or drop THIS device's token (off) so the
// backend stops pushing to it.
export async function setPushPreference(enabled: boolean): Promise<void> {
  await setPushEnabledPref(enabled);
  if (enabled) {
    await registerPushToken();
    return;
  }
  try {
    if (!Device.isDevice || !projectId) return;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.rpc('unregister_push_token', { p_token: token.data });
  } catch {
    /* best-effort */
  }
}

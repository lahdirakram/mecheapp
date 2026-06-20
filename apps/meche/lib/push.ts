import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

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

// Register this device's Expo push token for `userId`. Best-effort: push is a nice-to-have, so any
// failure (denied permission, simulator, missing projectId) is swallowed and never breaks the app.
export async function registerPushToken(userId: string): Promise<void> {
  try {
    if (!Device.isDevice || !projectId) return; // simulators can't mint a token

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
    // One row per (user, token); upsert keeps it idempotent across relaunches.
    await supabase
      .from('devices')
      .upsert({ user_id: userId, expo_push_token: token.data, platform: Platform.OS }, { onConflict: 'user_id,expo_push_token' });
  } catch {
    /* non-blocking */
  }
}

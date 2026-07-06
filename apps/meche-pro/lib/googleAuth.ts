import { Platform } from 'react-native';

// Native Google Sign-In → returns a Google ID token to exchange with Supabase
// (signInWithIdToken). The module is loaded lazily so the web bundle (which has no native
// Google module) doesn't break. webClientId is the public Web OAuth client (also set in Supabase);
// iosClientId is the iOS OAuth client — required on iOS since we ship no GoogleService-Info.plist.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export type GoogleResult = { idToken: string } | { cancelled: true } | { error: string };

export async function signInWithGoogleNative(): Promise<GoogleResult> {
  if (Platform.OS === 'web') return { error: 'web-unsupported' };
  if (!WEB_CLIENT_ID) return { error: 'no-web-client-id' };
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      ...(Platform.OS === 'ios' && IOS_CLIENT_ID ? { iosClientId: IOS_CLIENT_ID } : {}),
    });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Clear the cached Google session so the account picker shows every time (lets the user pick
    // a different account instead of silently reusing the last one).
    await GoogleSignin.signOut().catch(() => {});
    const res = await GoogleSignin.signIn();
    if (res.type !== 'success') return { cancelled: true };
    const idToken = res.data.idToken;
    if (!idToken) return { error: 'no-id-token' };
    return { idToken };
  } catch (e) {
    return { error: String((e as Error)?.message ?? e) };
  }
}

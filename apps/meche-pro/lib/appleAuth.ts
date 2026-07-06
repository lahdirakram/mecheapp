import { Platform } from 'react-native';

// Native Sign in with Apple → returns an Apple identity token to exchange with Supabase
// (signInWithIdToken, provider 'apple'). iOS-only; the module is imported lazily so the Android /
// web bundle never pulls it in. Requires the Sign in with Apple capability on the App ID and the
// Apple provider enabled in Supabase Auth (with com.meche.app as an authorized client).
export type AppleResult = { identityToken: string } | { cancelled: true } | { error: string };

export async function signInWithAppleNative(): Promise<AppleResult> {
  if (Platform.OS !== 'ios') return { error: 'ios-only' };
  try {
    const AppleAuthentication = await import('expo-apple-authentication');
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const idToken = credential.identityToken;
    if (!idToken) return { error: 'no-identity-token' };
    return { identityToken: idToken };
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((e as any)?.code === 'ERR_REQUEST_CANCELED') return { cancelled: true };
    return { error: String((e as Error)?.message ?? e) };
  }
}

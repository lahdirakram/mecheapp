import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@meche/api-client';
import { signInWithAppleNative } from './appleAuth';

// Shared native Sign in with Apple used by both the signup (choice) and login screens. Mirrors
// useGoogleSignIn: returns the handler + a `busy` flag for the "Connexion…" overlay. iOS-only — the
// button that calls this is hidden on Android.
export function useAppleSignIn() {
  const router = useRouter();
  const { signInApple } = useAuth();
  const [busy, setBusy] = useState(false);

  const onApple = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await signInWithAppleNative();
      if ('cancelled' in r) return;
      if ('error' in r) {
        Alert.alert('Oups', 'Connexion Apple impossible. Réessaie.');
        return;
      }
      const { error } = await signInApple(r.identityToken);
      if (error) {
        Alert.alert('Oups', error.message);
        return;
      }
      router.replace('/(tabs)/explore');
    } finally {
      setBusy(false);
    }
  };

  return { onApple, busy };
}

import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@meche/api-client';
import { signInWithGoogleNative } from './googleAuth';

// Shared native-Google sign-in used by both the signup (choice) and login screens. Returns the
// handler + a `busy` flag for the "Connexion…" overlay. signInWithIdToken creates-or-signs-in, so
// the same flow works whether the user is new or returning.
export function useGoogleSignIn() {
  const router = useRouter();
  const { signInGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  const onGoogle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await signInWithGoogleNative();
      if ('cancelled' in r) return;
      if ('error' in r) {
        Alert.alert('Oups', r.error === 'web-unsupported' ? 'Connexion Google disponible sur l’app mobile.' : 'Connexion Google impossible. Réessaie.');
        return;
      }
      const { error } = await signInGoogle(r.idToken);
      if (error) {
        Alert.alert('Oups', error.message);
        return;
      }
      router.replace('/(tabs)/explore');
    } finally {
      setBusy(false);
    }
  };

  return { onGoogle, busy };
}

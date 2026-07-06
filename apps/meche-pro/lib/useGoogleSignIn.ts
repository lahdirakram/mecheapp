import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@meche/api-client';
import { signInWithGoogleNative } from './googleAuth';
import { supabase } from './supabase';

// Native Google sign-in for the PRO app. Same flow as B2C, plus claim_pro_role() (see
// useAppleSignIn for why). The button only renders when EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set.
export function useGoogleSignIn() {
  const router = useRouter();
  const qc = useQueryClient();
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
      await supabase.rpc('claim_pro_role');
      qc.invalidateQueries({ queryKey: ['profile'] });
      router.replace('/(tabs)/studio');
    } finally {
      setBusy(false);
    }
  };

  return { onGoogle, busy };
}

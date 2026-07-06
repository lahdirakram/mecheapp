import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@meche/api-client';
import { signInWithAppleNative } from './appleAuth';
import { supabase } from './supabase';

// Native Sign in with Apple for the PRO app. Same flow as B2C, plus claim_pro_role(): a social
// sign-in creates the auth user without role metadata (profile defaults to b2c), and the server
// switches a FRESH account to pro (an existing client account stays b2c → NotAPro screen).
export function useAppleSignIn() {
  const router = useRouter();
  const qc = useQueryClient();
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
      await supabase.rpc('claim_pro_role');
      qc.invalidateQueries({ queryKey: ['profile'] });
      router.replace('/(tabs)/studio');
    } finally {
      setBusy(false);
    }
  };

  return { onApple, busy };
}

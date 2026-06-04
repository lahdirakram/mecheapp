import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MPAL, MText, MWordmark, useLang } from '@meche/ui';
import { supabase } from '../lib/supabase';

// Deep-link target for the email-confirmation link (meche://auth-callback?code=…). We exchange the
// PKCE code for a session here, then drop the user straight into the app — no manual re-login.
export default function AuthCallback() {
  const router = useRouter();
  const lang = useLang();
  const { code, error_description } = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (error_description || !code) {
        if (active) setFailed(true);
        setTimeout(() => active && router.replace('/(auth)/signin'), 1600);
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(String(code));
      if (!active) return;
      if (error) {
        setFailed(true);
        setTimeout(() => active && router.replace('/(auth)/signin'), 1600);
      } else {
        router.replace('/(tabs)/explore');
      }
    })();
    return () => {
      active = false;
    };
  }, [code, error_description, router]);

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 30 }}>
      <MWordmark size={26} />
      {failed ? (
        <MText size={14} color={MPAL.mute} style={{ textAlign: 'center', lineHeight: 20 }}>
          {lang === 'fr' ? 'Lien expiré ou déjà utilisé. Reconnecte-toi.' : 'Link expired or already used. Please sign in.'}
        </MText>
      ) : (
        <>
          <ActivityIndicator color={MPAL.ink} />
          <MText size={14} color={MPAL.mute}>
            {lang === 'fr' ? 'Connexion…' : 'Signing you in…'}
          </MText>
        </>
      )}
    </View>
  );
}

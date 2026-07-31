import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@meche/api-client';
import { MIcon, MPAL, MText, PrimaryButton, TextField, useLang, useT } from '@meche/ui';

// Onboarding · Connexion par code (OTP), sans mot de passe.
//
// Pourquoi cet écran existe : le studio web inscrit les gens avec un code email et ne leur donne
// jamais de mot de passe. Ces comptes ne pouvaient donc pas entrer dans l'app, qui exige
// `signInWithPassword`. Ça règle aussi le cas bien plus courant du mot de passe oublié.
//
// L'email a déjà été saisi sur `signin.tsx`, qui a envoyé le code avant de router ici.

// Même intervalle que `confirm.tsx` : Supabase impose 60 s entre deux envois par utilisateur, donc
// un renvoi plus tôt échouerait côté serveur.
const RESEND_COOLDOWN = 60;

export default function SignInWithCode() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const { signInWithEmailCode, verifySignInOtp } = useAuth();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const verify = async () => {
    if (!email || code.length < 6 || busy) return;
    setBusy(true);
    const { error } = await verifySignInOtp(email.trim().toLowerCase(), code);
    setBusy(false);
    if (error) {
      setCode('');
      Alert.alert(lang === 'fr' ? 'Connexion échouée' : 'Sign-in failed', t('code_error'));
      return;
    }
    router.replace('/(tabs)/explore');
  };

  // Le pavé numérique n'a pas de touche de validation : on vérifie dès le 6e chiffre. C'est aussi
  // pour ça que la longueur du code DOIT rester à 6 dans le dashboard Supabase (voir CLAUDE.md).
  useEffect(() => {
    if (code.length === 6 && !busy) verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const resend = async () => {
    if (cooldown > 0 || !email) return;
    setCooldown(RESEND_COOLDOWN);
    // Volontairement sans distinction succès/échec : une erreur « utilisateur inconnu » révélerait
    // qu'une adresse a un compte. Même posture que `resetPassword`, qui renvoie toujours un succès.
    await signInWithEmailCode(email.trim().toLowerCase()).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: 26 }}>
        <Pressable
          hitSlop={8}
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}
        >
          <MIcon name="chevronLeft" size={18} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 26, paddingTop: 18 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <MText variant="serif" size={30} style={{ marginTop: 12, lineHeight: 34 }}>
          {t('code_title')}
        </MText>
        <MText size={14} color={MPAL.mute} style={{ marginTop: 8, lineHeight: 20 }}>
          {t('confirm_sub')}
          {'\n'}
          <MText size={14} color={MPAL.ink} variant="bodySemibold">
            {email ?? ''}
          </MText>
        </MText>

        <View style={{ marginTop: 18 }}>
          <TextField
            icon="lock"
            value={code}
            onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder={t('confirm_code_ph')}
            keyboardType="number-pad"
            maxLength={6}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoFocus
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 4 }}>
            <MIcon name="mail" size={14} color={MPAL.mute} />
            <MText size={12} color={MPAL.mute} style={{ flex: 1, lineHeight: 16 }}>
              {t('code_help')}
            </MText>
          </View>
        </View>

        <View style={{ marginTop: 'auto', paddingBottom: insets.bottom + 16, gap: 10 }}>
          <PrimaryButton
            label={busy ? '…' : t('auth_signin')}
            tone="ink"
            icon="check"
            disabled={code.length < 6 || busy}
            onPress={verify}
          />
          <Pressable
            disabled={cooldown > 0}
            onPress={resend}
            style={{ height: 46, borderRadius: 23, borderWidth: 1, borderColor: MPAL.border, alignItems: 'center', justifyContent: 'center', opacity: cooldown > 0 ? 0.45 : 1 }}
          >
            <MText size={14} color={MPAL.ink}>
              {cooldown > 0 ? `${t('confirm_resend')} (${cooldown}s)` : t('confirm_resend')}
            </MText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

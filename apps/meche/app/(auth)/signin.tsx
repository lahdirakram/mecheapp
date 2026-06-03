import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@meche/api-client';
import { MIcon, MPAL, MText, PrimaryButton, TextField, useLang, useT } from '@meche/ui';

// Onboarding · Sign-in — for "J'ai déjà un compte" / "Me connecter". Email + password login.
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const { signInEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const valid = /\S+@\S+\.\S+/.test(email) && pwd.length >= 1;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const { error } = await signInEmail(email.trim(), pwd);
    setBusy(false);
    if (error) Alert.alert(lang === 'fr' ? 'Connexion échouée' : 'Sign-in failed', error.message);
    else router.replace('/(tabs)/explore');
  };

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: 26 }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
          <MIcon name="chevronLeft" size={18} />
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 18 }}>
        <MText variant="mono" size={10} color={MPAL.ink} style={{ letterSpacing: 1.4 }}>
          {lang === 'fr' ? 'CONNEXION' : 'SIGN IN'}
        </MText>
        <MText variant="serif" size={34} style={{ marginTop: 8, lineHeight: 38 }}>
          {lang === 'fr' ? 'Content de te revoir.' : 'Good to see you again.'}
        </MText>

        <View style={{ marginTop: 24, gap: 14 }}>
          <TextField label={t('email_label')} icon="mail" value={email} onChangeText={setEmail} placeholder={t('email_ph')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <TextField
            label={t('pwd_label')}
            icon="lock"
            value={pwd}
            onChangeText={setPwd}
            placeholder="••••••••"
            secureTextEntry={!show}
            autoCapitalize="none"
            trailing={
              <MText variant="bodySemibold" size={11} color={MPAL.mute} onPress={() => setShow((s) => !s)}>
                {show ? 'CACHER' : 'VOIR'}
              </MText>
            }
          />
        </View>

        <View style={{ marginTop: 'auto', paddingBottom: insets.bottom + 24, gap: 12 }}>
          <PrimaryButton label={busy ? '…' : t('auth_signin')} tone="ink" icon="arrowRight" disabled={!valid || busy} onPress={submit} />
          <MText size={13} color={MPAL.mute} style={{ textAlign: 'center' }}>
            {lang === 'fr' ? 'Pas encore de compte ? ' : 'No account yet? '}
            <MText size={13} color={MPAL.ink} variant="bodySemibold" onPress={() => router.replace('/(auth)/signup')} style={{ textDecorationLine: 'underline' }}>
              {lang === 'fr' ? 'Créer' : 'Create one'}
            </MText>
          </MText>
        </View>
      </View>
    </View>
  );
}

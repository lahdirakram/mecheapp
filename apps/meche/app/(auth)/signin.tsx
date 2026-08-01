import { useRef, useState } from 'react';
import { Alert, Platform, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@meche/api-client';
import { MPAL, MText, PrimaryButton, TextField, useLang, useT } from '@meche/ui';
import { useGoogleSignIn } from '../../lib/useGoogleSignIn';
import { useAppleSignIn } from '../../lib/useAppleSignIn';
import { LegalConsent } from '../../components/LegalConsent';
import { AuthScreen, OrDivider, ShowHide, SocialButton } from '../../components/AuthScreen';

// Onboarding · Sign-in — same options as signup (Apple/Google/email) for consistency. Social
// providers create-or-sign-in via signInWithIdToken, so they work for returning users too.
export default function SignIn() {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const { signInEmail, signInWithEmailCode } = useAuth();
  const { onGoogle, busy: googleBusy } = useGoogleSignIn();
  const { onApple, busy: appleBusy } = useAppleSignIn();
  const pwdRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const valid = /\S+@\S+\.\S+/.test(email) && pwd.length >= 1;

  // Connexion sans mot de passe : indispensable pour les comptes créés par le studio web, qui
  // n'en ont jamais eu. On ne distingue PAS succès et échec ici : une erreur « utilisateur
  // inconnu » dirait qu'une adresse a un compte. `signInWithEmailCode` passe déjà
  // `shouldCreateUser: false`, donc une faute de frappe ne crée rien, elle n'envoie rien.
  const sendCode = async () => {
    const addr = email.trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(addr)) {
      Alert.alert(lang === 'fr' ? 'Email' : 'Email', t('code_email_first'));
      return;
    }
    if (busy) return;
    setBusy(true);
    await signInWithEmailCode(addr).catch(() => {});
    setBusy(false);
    router.push({ pathname: '/(auth)/code', params: { email: addr } });
  };

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const { error } = await signInEmail(email.trim(), pwd);
    setBusy(false);
    if (error) Alert.alert(lang === 'fr' ? 'Connexion échouée' : 'Sign-in failed', error.message);
    else router.replace('/(tabs)/explore');
  };

  return (
    <AuthScreen
      busy={googleBusy || appleBusy}
      header={
        <>
          <MText variant="mono" size={10} color={MPAL.ink} style={{ letterSpacing: 1.4 }}>
            {lang === 'fr' ? 'CONNEXION' : 'SIGN IN'}
          </MText>
          <MText variant="serif" size={32} style={{ marginTop: 6, lineHeight: 36 }}>
            {lang === 'fr' ? 'Content de te revoir.' : 'Good to see you again.'}
          </MText>
        </>
      }
    >
      {Platform.OS === 'ios' ? <SocialButton label={t('auth_apple')} icon="apple" filled onPress={onApple} /> : null}
      {Platform.OS !== 'ios' ? <SocialButton label={t('auth_google')} icon="google" onPress={onGoogle} /> : null}
      <OrDivider />

      <View style={{ gap: 12 }}>
        <TextField
          label={t('email_label')}
          icon="mail"
          value={email}
          onChangeText={setEmail}
          placeholder={t('email_ph')}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => pwdRef.current?.focus()}
          blurOnSubmit={false}
        />
        <TextField
          label={t('pwd_label')}
          icon="lock"
          inputRef={pwdRef}
          value={pwd}
          onChangeText={setPwd}
          placeholder="••••••••"
          secureTextEntry={!show}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          trailing={<ShowHide shown={show} onToggle={() => setShow((s) => !s)} />}
        />
        <MText
          size={13}
          color={MPAL.ink}
          variant="bodySemibold"
          onPress={() => router.push('/(auth)/forgot')}
          style={{ alignSelf: 'flex-end', paddingVertical: 4, textDecorationLine: 'underline' }}
        >
          {t('forgot_link')}
        </MText>
      </View>

      <PrimaryButton label={busy ? '…' : t('auth_signin')} tone="ink" icon="arrowRight" disabled={!valid || busy} onPress={submit} />
      <MText
        size={13}
        color={MPAL.ink}
        variant="bodySemibold"
        onPress={sendCode}
        style={{ textAlign: 'center', paddingVertical: 6, textDecorationLine: 'underline' }}
      >
        {t('signin_code_link')}
      </MText>
      <LegalConsent />
      <MText size={13} color={MPAL.mute} style={{ textAlign: 'center' }}>
        {lang === 'fr' ? 'Pas encore de compte ? ' : 'No account yet? '}
        <MText size={13} color={MPAL.ink} variant="bodySemibold" onPress={() => router.replace('/(auth)/signup')} style={{ textDecorationLine: 'underline' }}>
          {lang === 'fr' ? 'Créer' : 'Create one'}
        </MText>
      </MText>
    </AuthScreen>
  );
}

import { useRef, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { rememberSignupPassword, useAuth } from '@meche/api-client';
import { MPAL, MText, PrimaryButton, TextField, useLang, useT } from '@meche/ui';
import { LegalConsent } from '../../components/LegalConsent';
import { AuthScreen, ShowHide } from '../../components/AuthScreen';

// Onboarding 01c · Email (form) — real Supabase email/password sign-up (role: b2c).
export default function SignupEmail() {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const { signUpEmail } = useAuth();
  const pwdRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const strength = Math.min(4, Math.floor(pwd.length / 2));
  const valid = /\S+@\S+\.\S+/.test(email) && pwd.length >= 8;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    // Confirmation email returns to the app via this deep link → auto-login (see root _layout).
    const redirectTo = Linking.createURL('auth-callback');
    const { data, error } = await signUpEmail(email.trim(), pwd, 'b2c', '', redirectTo, lang);
    setBusy(false);
    if (error) {
      Alert.alert('Oups', error.message);
      return;
    }
    // Local Supabase auto-confirms → session exists; otherwise show the confirm screen, which
    // re-applies this password once the code opens a session (see rememberSignupPassword).
    if (data.session) router.replace('/(tabs)/explore');
    else {
      rememberSignupPassword(pwd);
      router.push({ pathname: '/(auth)/confirm', params: { email: email.trim() } });
    }
  };

  return (
    <AuthScreen
      header={
        <>
          <MText variant="mono" size={10} color={MPAL.ink} style={{ letterSpacing: 1.4 }}>
            ÉTAPE 1 · COMPTE
          </MText>
          <MText variant="serif" size={34} style={{ marginTop: 8, lineHeight: 38 }}>
            {lang === 'fr' ? 'Ton ' : 'Your '}
            <MText variant="serifItalic" size={34}>
              {lang === 'fr' ? 'email' : 'email'}
            </MText>
            {lang === 'fr' ? ' et un mot de passe.' : ' and a password.'}
          </MText>
        </>
      }
    >
      <View style={{ gap: 14 }}>
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
          autoFocus
        />
        <TextField
          label={t('pwd_label')}
          icon="lock"
          inputRef={pwdRef}
          value={pwd}
          onChangeText={setPwd}
          placeholder={t('pwd_ph')}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          passwordRules="minlength: 8;"
          returnKeyType="go"
          onSubmitEditing={submit}
          trailing={<ShowHide shown={show} onToggle={() => setShow((s) => !s)} />}
        />
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: i < strength ? MPAL.ink : MPAL.border }} />
          ))}
        </View>
        <MText size={11} color={MPAL.mute}>
          8 caractères, 1 chiffre. Tu choisis.
        </MText>
      </View>

      <PrimaryButton label={busy ? '…' : t('create_account')} tone="ink" icon="arrowRight" disabled={!valid || busy} onPress={submit} />
      <LegalConsent />
    </AuthScreen>
  );
}

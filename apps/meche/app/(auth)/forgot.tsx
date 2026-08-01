import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@meche/api-client';
import { MPAL, MText, PrimaryButton, TextField, useLang, useT } from '@meche/ui';
import { AuthScreen } from '../../components/AuthScreen';

// Onboarding · Mot de passe oublié (étape 1). Sends a 6-digit recovery code to the email (the
// Supabase "Reset Password" template must expose {{ .Token }}, like the signup one), then routes
// to /reset to enter the code + a new password. Supabase returns success even for unknown emails,
// so we never reveal whether an account exists.
export default function Forgot() {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = /\S+@\S+\.\S+/.test(email);

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const addr = email.trim();
    await resetPassword(addr);
    setBusy(false);
    router.push({ pathname: '/(auth)/reset', params: { email: addr } });
  };

  return (
    <AuthScreen
      header={
        <>
          <MText variant="mono" size={10} color={MPAL.ink} style={{ letterSpacing: 1.4 }}>
            {lang === 'fr' ? 'RÉINITIALISATION' : 'PASSWORD RESET'}
          </MText>
          <MText variant="serif" size={32} style={{ marginTop: 6, lineHeight: 36 }}>
            {t('forgot_title')}
          </MText>
          <MText size={14} color={MPAL.mute} style={{ marginTop: 8, lineHeight: 20 }}>
            {t('forgot_sub')}
          </MText>
        </>
      }
    >
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
        returnKeyType="go"
        onSubmitEditing={submit}
        autoFocus
      />
      <PrimaryButton label={busy ? '…' : t('forgot_send')} tone="ink" icon="arrowRight" disabled={!valid || busy} onPress={submit} />
    </AuthScreen>
  );
}

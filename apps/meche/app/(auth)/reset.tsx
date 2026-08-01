import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@meche/api-client';
import { MIcon, MPAL, MText, PrimaryButton, TextField, useLang, useT } from '@meche/ui';
import { AuthScreen, ShowHide } from '../../components/AuthScreen';

// Onboarding · Mot de passe oublié (étape 2). The recovery email carries a 6-digit code
// ({{ .Token }} in the Supabase "Reset Password" template); the user types it here with a new
// password → verifyOtp(type:'recovery') opens a session, then updateUser sets the password. On
// success the auth guard sees the new session and sends the user into the app.

// Matches Supabase's per-user 60s send interval so a resend never hits a "wait" error.
const RESEND_COOLDOWN = 60;

export default function Reset() {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const { verifyRecoveryOtp, updatePassword, resetPassword } = useAuth();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const pwdRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [pwd, setPwd] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const valid = code.length === 6 && pwd.length >= 8;

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const submit = async () => {
    if (!valid || busy || !email) return;
    setBusy(true);
    const { error: otpError } = await verifyRecoveryOtp(email, code.trim());
    if (otpError) {
      setBusy(false);
      Alert.alert('Oups', lang === 'fr' ? 'Code invalide ou expiré. Réessaie.' : 'Invalid or expired code. Try again.');
      return;
    }
    const { error: pwdError } = await updatePassword(pwd);
    setBusy(false);
    if (pwdError) {
      Alert.alert('Oups', pwdError.message);
      return;
    }
    router.replace('/(tabs)/explore');
  };

  const resend = () => {
    if (cooldown > 0 || !email) return;
    resetPassword(email);
    setCooldown(RESEND_COOLDOWN);
  };

  return (
    <AuthScreen
      header={
        <>
          <MText variant="mono" size={10} color={MPAL.ink} style={{ letterSpacing: 1.4 }}>
            {lang === 'fr' ? 'RÉINITIALISATION' : 'PASSWORD RESET'}
          </MText>
          <MText variant="serif" size={32} style={{ marginTop: 6, lineHeight: 36 }}>
            {t('reset_title')}
          </MText>
          <MText size={14} color={MPAL.mute} style={{ marginTop: 8, lineHeight: 20 }}>
            {t('reset_sub')}
            {email ? (
              <>
                {'\n'}
                <MText size={14} color={MPAL.ink} variant="bodySemibold">
                  {email}
                </MText>
              </>
            ) : null}
          </MText>
        </>
      }
    >
      <View style={{ gap: 12 }}>
        <TextField
          label={t('confirm_code_ph')}
          icon="lock"
          value={code}
          onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
          placeholder={t('confirm_code_ph')}
          keyboardType="number-pad"
          maxLength={6}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          returnKeyType="next"
          onSubmitEditing={() => pwdRef.current?.focus()}
          blurOnSubmit={false}
          autoFocus
        />
        <TextField
          label={t('reset_pwd_label')}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
          <MIcon name="mail" size={14} color={MPAL.mute} />
          <MText size={12} color={MPAL.mute} style={{ flex: 1, lineHeight: 16 }}>
            {t('confirm_help')}
          </MText>
        </View>
      </View>

      <PrimaryButton label={busy ? '…' : t('reset_cta')} tone="ink" icon="check" disabled={!valid || busy} onPress={submit} />
      <Pressable
        onPress={resend}
        disabled={cooldown > 0}
        style={({ pressed }) => ({ paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: MPAL.border, alignItems: 'center', opacity: cooldown > 0 ? 0.5 : pressed ? 0.7 : 1 })}
      >
        <MText variant="bodySemibold" size={13} color={MPAL.ink}>
          {cooldown > 0 ? `${t('confirm_resend')} (${cooldown}s)` : t('confirm_resend')}
        </MText>
      </Pressable>
    </AuthScreen>
  );
}

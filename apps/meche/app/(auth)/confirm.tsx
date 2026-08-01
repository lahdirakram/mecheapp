import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { takeSignupPassword, useAuth } from '@meche/api-client';
import { MIcon, MPAL, MText, MWordmark, PrimaryButton, TextField, useLang, useT } from '@meche/ui';
import { AuthScreen } from '../../components/AuthScreen';

// Onboarding 01d · Vérification email par code (OTP). The signup email carries a 6-digit code
// ({{ .Token }} in the Supabase "Confirm signup" template); the user types it here → verifyOtp
// confirms the account and stores the session. Works on any device, unlike the magic-link flow.

// Min delay between confirmation-email sends, to cap cost / abuse. Starts armed on mount because
// signup already sent one. Matches Supabase's fixed per-user 60s interval so a resend never hits a
// server "wait" error; the project email/hour cap is the real cost backstop.
const RESEND_COOLDOWN = 60;

export default function EmailConfirm() {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const { verifyEmailOtp, resendConfirmation, updatePassword } = useAuth();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const verify = async () => {
    if (code.length < 6 || busy || !email) return;
    setBusy(true);
    const { error } = await verifyEmailOtp(email, code.trim());
    if (error) {
      setBusy(false);
      Alert.alert('Oups', lang === 'fr' ? 'Code invalide ou expiré. Réessaie.' : 'Invalid or expired code. Try again.');
      return;
    }
    // Le mot de passe qui vient d'être saisi devient le bon. Une inscription refaite avec la même
    // adresse (le geste naturel quand on n'a jamais reçu son code) NE remplace PAS le mot de passe
    // côté Supabase : le tout premier reste actif, et la personne se retrouverait dehors à sa
    // prochaine connexion. La session ouverte par verifyOtp autorise la correction, et l'inbox a
    // déjà été prouvée par le code, donc ça n'ouvre rien de plus qu'un mot de passe oublié.
    // Échec ignoré VOLONTAIREMENT : `same_password` (422) veut juste dire que c'est déjà le bon,
    // et aucune autre erreur ne justifie de bloquer une entrée légitime.
    const pwd = takeSignupPassword();
    if (pwd) await updatePassword(pwd).catch(() => {});
    setBusy(false);
    router.replace('/(tabs)/explore');
  };

  // The numeric keypad has no "submit" key, so auto-verify as soon as the 6 digits are in.
  useEffect(() => {
    if (code.length === 6 && !busy) verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const resend = () => {
    if (cooldown > 0 || !email) return;
    resendConfirmation(email);
    setCooldown(RESEND_COOLDOWN);
  };

  return (
    <AuthScreen
      header={
        <>
          <MText variant="mono" size={10} color={MPAL.ink} style={{ letterSpacing: 1.4 }}>
            ÉTAPE 2 · VÉRIFICATION
          </MText>

          {/* envelope illustration */}
          <View style={{ height: 130, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
            <View style={{ width: 168, height: 122, borderRadius: 14, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border, transform: [{ rotate: '-3deg' }] }}>
              <Svg width="100%" height="100%" viewBox="0 0 180 130" style={{ position: 'absolute' }}>
                <Path d="M2 8 L90 70 L178 8" fill="none" stroke={MPAL.border} strokeWidth={1.5} />
                <Path d="M2 122 L72 70 M178 122 L108 70" fill="none" stroke={MPAL.border} strokeWidth={1.5} />
              </Svg>
              <View style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 38, backgroundColor: MPAL.ink, borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
                <MWordmark size={12} color="#fff" accent="#fff" />
              </View>
            </View>
            <View style={{ position: 'absolute', top: 6, left: '54%' }}>
              <MIcon name="sparkle" size={22} color={MPAL.sable} fill={MPAL.sable} stroke={0} />
            </View>
          </View>

          <MText variant="serif" size={30} style={{ marginTop: 12, textAlign: 'center', lineHeight: 34 }}>
            {t('confirm_title')}
          </MText>
          <MText size={14} color={MPAL.mute} style={{ marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            {t('confirm_sub')}
            {'\n'}
            <MText size={14} color={MPAL.ink} variant="bodySemibold">
              {email ?? ''}
            </MText>
          </MText>
        </>
      }
    >
      <View style={{ gap: 12 }}>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
          <MIcon name="mail" size={14} color={MPAL.mute} />
          <MText size={12} color={MPAL.mute} style={{ flex: 1, lineHeight: 16 }}>
            {t('confirm_help')}
          </MText>
        </View>
      </View>

      <PrimaryButton label={busy ? '…' : t('confirm_verify')} tone="ink" icon="check" disabled={code.length < 6 || busy} onPress={verify} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <OutlineButton label={cooldown > 0 ? `${t('confirm_resend')} (${cooldown}s)` : t('confirm_resend')} disabled={cooldown > 0} onPress={resend} />
        <OutlineButton label={t('confirm_change')} onPress={() => router.replace('/(auth)/signup')} />
      </View>
    </AuthScreen>
  );
}

function OutlineButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({ flex: 1, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: MPAL.border, alignItems: 'center', opacity: disabled ? 0.5 : pressed ? 0.7 : 1 })}
    >
      <MText variant="bodySemibold" size={13} color={MPAL.ink}>
        {label}
      </MText>
    </Pressable>
  );
}

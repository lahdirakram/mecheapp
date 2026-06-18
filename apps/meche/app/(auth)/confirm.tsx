import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@meche/api-client';
import { MIcon, MPAL, MText, MWordmark, PrimaryButton, TextField, useLang, useT } from '@meche/ui';

// Onboarding 01d · Vérification email par code (OTP). The signup email carries a 6-digit code
// ({{ .Token }} in the Supabase "Confirm signup" template); the user types it here → verifyOtp
// confirms the account and stores the session. Works on any device, unlike the magic-link flow.

// Min delay between confirmation-email sends, to cap cost / abuse. Starts armed on mount because
// signup already sent one. Matches Supabase's fixed per-user 60s interval so a resend never hits a
// server "wait" error; the project email/hour cap is the real cost backstop.
const RESEND_COOLDOWN = 60;

export default function EmailConfirm() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const { verifyEmailOtp, resendConfirmation } = useAuth();
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
    setBusy(false);
    if (error) {
      Alert.alert('Oups', lang === 'fr' ? 'Code invalide ou expiré. Réessaie.' : 'Invalid or expired code. Try again.');
      return;
    }
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
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: 26 }}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
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
              {t('confirm_help')}
            </MText>
          </View>
        </View>

        <View style={{ marginTop: 'auto', paddingBottom: insets.bottom + 16, gap: 10 }}>
          <PrimaryButton label={busy ? '…' : t('confirm_verify')} tone="ink" icon="check" disabled={code.length < 6 || busy} onPress={verify} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <OutlineButton label={cooldown > 0 ? `${t('confirm_resend')} (${cooldown}s)` : t('confirm_resend')} disabled={cooldown > 0} onPress={resend} />
            <OutlineButton label={t('confirm_change')} onPress={() => router.replace('/(auth)/signup')} />
          </View>
        </View>
      </ScrollView>
    </View>
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

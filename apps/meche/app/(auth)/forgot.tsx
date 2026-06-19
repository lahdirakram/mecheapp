import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@meche/api-client';
import { MIcon, MPAL, MText, PrimaryButton, TextField, useLang, useT } from '@meche/ui';

// Onboarding · Mot de passe oublié (étape 1). Sends a 6-digit recovery code to the email (the
// Supabase "Reset Password" template must expose {{ .Token }}, like the signup one), then routes
// to /reset to enter the code + a new password. Supabase returns success even for unknown emails,
// so we never reveal whether an account exists.
export default function Forgot() {
  const insets = useSafeAreaInsets();
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
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: 26 }}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
          <MIcon name="chevronLeft" size={18} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 26, paddingTop: 16 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <MText variant="mono" size={10} color={MPAL.ink} style={{ letterSpacing: 1.4 }}>
          {lang === 'fr' ? 'RÉINITIALISATION' : 'PASSWORD RESET'}
        </MText>
        <MText variant="serif" size={32} style={{ marginTop: 6, lineHeight: 36 }}>
          {t('forgot_title')}
        </MText>
        <MText size={14} color={MPAL.mute} style={{ marginTop: 8, lineHeight: 20 }}>
          {t('forgot_sub')}
        </MText>

        <View style={{ marginTop: 22 }}>
          <TextField
            label={t('email_label')}
            icon="mail"
            value={email}
            onChangeText={setEmail}
            placeholder={t('email_ph')}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="go"
            onSubmitEditing={submit}
            autoFocus
          />
        </View>

        <View style={{ marginTop: 'auto', paddingBottom: insets.bottom + 20, gap: 10 }}>
          <PrimaryButton label={busy ? '…' : t('forgot_send')} tone="ink" icon="arrowRight" disabled={!valid || busy} onPress={submit} />
        </View>
      </ScrollView>
    </View>
  );
}

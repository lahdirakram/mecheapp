import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@meche/api-client';
import { MIcon, MPAL, MText, PrimaryButton, TextField, useLang, useT } from '@meche/ui';

// Onboarding 01c · Email (form) — real Supabase email/password sign-up (role: b2c).
export default function SignupEmail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const { signUpEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const strength = Math.min(4, Math.floor(pwd.length / 2));
  const valid = /\S+@\S+\.\S+/.test(email) && pwd.length >= 8;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const { data, error } = await signUpEmail(email.trim(), pwd, 'b2c');
    setBusy(false);
    if (error) {
      Alert.alert('Oups', error.message);
      return;
    }
    // Local Supabase auto-confirms → session exists; otherwise show the confirm screen.
    if (data.session) router.replace('/(tabs)/explore');
    else router.push({ pathname: '/(auth)/confirm', params: { email: email.trim() } });
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
          ÉTAPE 1 · COMPTE
        </MText>
        <MText variant="serif" size={34} style={{ marginTop: 8, lineHeight: 38 }}>
          {lang === 'fr' ? 'Ton ' : 'Your '}
          <MText variant="serifItalic" size={34}>
            {lang === 'fr' ? 'email' : 'email'}
          </MText>
          {lang === 'fr' ? ' et un mot de passe.' : ' and a password.'}
        </MText>

        <View style={{ marginTop: 24, gap: 14 }}>
          <TextField
            label={t('email_label')}
            icon="mail"
            value={email}
            onChangeText={setEmail}
            placeholder={t('email_ph')}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextField
            label={t('pwd_label')}
            icon="lock"
            value={pwd}
            onChangeText={setPwd}
            placeholder={t('pwd_ph')}
            secureTextEntry={!show}
            autoCapitalize="none"
            trailing={
              <MText variant="bodySemibold" size={11} color={MPAL.mute} onPress={() => setShow((s) => !s)}>
                {show ? 'CACHER' : 'VOIR'}
              </MText>
            }
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

        <View style={{ marginTop: 'auto', paddingBottom: insets.bottom + 24, gap: 10 }}>
          <PrimaryButton label={busy ? '…' : t('create_account')} tone="ink" icon="arrowRight" disabled={!valid || busy} onPress={submit} />
          <MText size={11} color={MPAL.mute} style={{ textAlign: 'center', lineHeight: 16, maxWidth: 300, alignSelf: 'center' }}>
            {t('auth_terms')}
          </MText>
        </View>
      </View>
    </View>
  );
}

import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@meche/api-client';
import { MIcon, MPAL, MText, PrimaryButton, TextField, useLang, useT } from '@meche/ui';
import { LegalConsent } from '../../components/LegalConsent';
import { SocialBusyOverlay, SocialButtons, useSocialAuth } from '../../components/SocialAuth';

// Onboarding · Sign-in. Apple/Google + email, same set as signup.
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const { signInEmail } = useAuth();
  const social = useSocialAuth();
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
    else router.replace('/(tabs)/studio');
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
          {lang === 'fr' ? 'CONNEXION' : 'SIGN IN'}
        </MText>
        <MText variant="serif" size={32} style={{ marginTop: 6, lineHeight: 36 }}>
          {lang === 'fr' ? 'Content de te revoir.' : 'Good to see you again.'}
        </MText>

        <SocialButtons onApple={social.onApple} onGoogle={social.onGoogle} showApple={social.showApple} showGoogle={social.showGoogle} />

        <View style={{ marginTop: social.any ? 14 : 22, gap: 12 }}>
          <TextField label={t('email_label')} icon="mail" value={email} onChangeText={setEmail} placeholder={t('email_ph')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <TextField
            label={t('pwd_label')}
            icon="lock"
            value={pwd}
            onChangeText={setPwd}
            placeholder="••••••••"
            secureTextEntry={!show}
            autoCapitalize="none"
            returnKeyType="go"
            onSubmitEditing={submit}
            trailing={
              <Pressable hitSlop={12} onPress={() => setShow((s) => !s)}>
                <MText variant="bodySemibold" size={11} color={MPAL.mute}>
                  {show ? 'CACHER' : 'VOIR'}
                </MText>
              </Pressable>
            }
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

        <View style={{ marginTop: 'auto', paddingBottom: insets.bottom + 20, gap: 10 }}>
          <PrimaryButton label={busy ? '…' : t('auth_signin')} tone="ink" icon="arrowRight" disabled={!valid || busy} onPress={submit} />
          <LegalConsent />
          <MText size={13} color={MPAL.mute} style={{ textAlign: 'center' }}>
            {lang === 'fr' ? 'Pas encore de compte ? ' : 'No account yet? '}
            <MText size={13} color={MPAL.ink} variant="bodySemibold" onPress={() => router.replace('/(auth)/signup')} style={{ textDecorationLine: 'underline' }}>
              {lang === 'fr' ? 'Créer' : 'Create one'}
            </MText>
          </MText>
        </View>
      </ScrollView>

      <SocialBusyOverlay visible={social.busy} />
    </View>
  );
}

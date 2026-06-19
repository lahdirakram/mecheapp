import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@meche/api-client';
import { MIcon, MPAL, MText, PrimaryButton, TextField, useLang, useT } from '@meche/ui';
import { useGoogleSignIn } from '../../lib/useGoogleSignIn';
import { useAppleSignIn } from '../../lib/useAppleSignIn';

// Onboarding · Sign-in — same options as signup (Apple/Google/email) for consistency. Social
// providers create-or-sign-in via signInWithIdToken, so they work for returning users too.
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const { signInEmail } = useAuth();
  const { onGoogle, busy: googleBusy } = useGoogleSignIn();
  const { onApple, busy: appleBusy } = useAppleSignIn();
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

        {/* social — same set as signup */}
        <View style={{ marginTop: 20, gap: 10 }}>
          {Platform.OS === 'ios' ? <SocialButton label={t('auth_apple')} icon="apple" filled onPress={onApple} /> : null}
          {Platform.OS !== 'ios' ? <SocialButton label={t('auth_google')} icon="google" onPress={onGoogle} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: MPAL.border }} />
            <MText variant="mono" size={10} color={MPAL.mute}>
              {t('auth_or')}
            </MText>
            <View style={{ flex: 1, height: 1, backgroundColor: MPAL.border }} />
          </View>
        </View>

        {/* email + password */}
        <View style={{ marginTop: 14, gap: 12 }}>
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
          <MText size={11} color={MPAL.mute} style={{ textAlign: 'center', lineHeight: 16, maxWidth: 320, alignSelf: 'center' }}>
            {t('auth_terms')}
          </MText>
          <MText size={13} color={MPAL.mute} style={{ textAlign: 'center' }}>
            {lang === 'fr' ? 'Pas encore de compte ? ' : 'No account yet? '}
            <MText size={13} color={MPAL.ink} variant="bodySemibold" onPress={() => router.replace('/(auth)/signup')} style={{ textDecorationLine: 'underline' }}>
              {lang === 'fr' ? 'Créer' : 'Create one'}
            </MText>
          </MText>
        </View>
      </ScrollView>

      {googleBusy || appleBusy ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(252,248,244,0.86)', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <ActivityIndicator color={MPAL.ink} size="large" />
          <MText size={14} color={MPAL.mute}>
            Connexion…
          </MText>
        </View>
      ) : null}
    </View>
  );
}

function SocialButton({ label, icon, filled, onPress }: { label: string; icon: 'apple' | 'google'; filled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 15,
        borderRadius: 999,
        backgroundColor: filled ? MPAL.ink : MPAL.paper,
        borderWidth: filled ? 0 : 1,
        borderColor: MPAL.border,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <MIcon name={icon} size={18} color={filled ? '#fff' : MPAL.ink} fill={icon === 'apple' && filled ? '#fff' : 'none'} stroke={icon === 'apple' && filled ? 0 : 1.7} />
      <MText variant="bodySemibold" size={15} color={filled ? MPAL.inkInv : MPAL.ink}>
        {label}
      </MText>
    </Pressable>
  );
}

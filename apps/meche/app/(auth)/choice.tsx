import { Platform, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MPAL, MText, MWordmark, useT } from '@meche/ui';
import { useGoogleSignIn } from '../../lib/useGoogleSignIn';
import { useAppleSignIn } from '../../lib/useAppleSignIn';
import { LegalConsent } from '../../components/LegalConsent';
import { AuthScreen, OrDivider, SocialButton } from '../../components/AuthScreen';

// Onboarding 01b · Compte (choix) — Apple / Google / email. Both social providers use native
// sign-in → Supabase signInWithIdToken. Apple is iOS-only (hidden on Android, and required by App
// Store guideline 4.8 when Google is offered). Email continues to the form.
// Avatars = real generated looks (one face, several cuts), same as the welcome collage.
const COINS = [
  { src: require('../../assets/onboarding/1.jpg'), dx: 0 },
  { src: require('../../assets/onboarding/3.jpg'), dx: -18 },
  { src: require('../../assets/onboarding/2.jpg'), dx: -18 },
];

export default function AuthChoice() {
  const router = useRouter();
  const t = useT();
  const { onGoogle, busy } = useGoogleSignIn();
  const { onApple, busy: appleBusy } = useAppleSignIn();

  return (
    <AuthScreen
      busy={busy || appleBusy}
      header={
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 84, marginTop: 10, marginBottom: 20 }}>
            {COINS.map((c, i) => (
              <View
                key={i}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  overflow: 'hidden',
                  borderWidth: 3,
                  borderColor: MPAL.bg,
                  marginLeft: c.dx,
                  zIndex: COINS.length - i,
                }}
              >
                <Image source={c.src} style={{ flex: 1 }} contentFit="cover" contentPosition="top" />
              </View>
            ))}
            <MText size={12} color={MPAL.mute} style={{ marginLeft: 8, maxWidth: 120, lineHeight: 17 }}>
              Une coupe, mille essais.
            </MText>
          </View>

          <MWordmark size={22} />
          <MText variant="serif" size={42} style={{ marginTop: 14, lineHeight: 42 }}>
            {t('auth_title')}.
          </MText>
          <MText variant="body" size={14} color={MPAL.mute} style={{ marginTop: 10, lineHeight: 20 }}>
            {t('auth_sub')}
          </MText>
        </>
      }
    >
      {Platform.OS === 'ios' ? <SocialButton label={t('auth_apple')} icon="apple" filled onPress={onApple} /> : null}
      {Platform.OS !== 'ios' ? <SocialButton label={t('auth_google')} icon="google" onPress={onGoogle} /> : null}
      <OrDivider />
      <SocialButton label={t('auth_email')} icon="mail" onPress={() => router.push('/(auth)/signup')} />

      <View style={{ marginTop: 10, alignItems: 'center' }}>
        <LegalConsent />
        <MText size={13} color={MPAL.mute} style={{ marginTop: 14 }}>
          {t('auth_have_account')}{' '}
          <MText size={13} color={MPAL.ink} variant="bodySemibold" onPress={() => router.push('/(auth)/signin')} style={{ textDecorationLine: 'underline' }}>
            {t('auth_signin')}
          </MText>
        </MText>
      </View>
    </AuthScreen>
  );
}

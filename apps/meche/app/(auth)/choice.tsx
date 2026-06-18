import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MIcon, MPAL, MText, MWordmark, useT } from '@meche/ui';
import { useGoogleSignIn } from '../../lib/useGoogleSignIn';
import { useAppleSignIn } from '../../lib/useAppleSignIn';

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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const { onGoogle, busy } = useGoogleSignIn();
  const { onApple, busy: appleBusy } = useAppleSignIn();

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: 26 }}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
          <MIcon name="chevronLeft" size={18} />
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 26 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 84, marginBottom: 20 }}>
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

        <View style={{ marginTop: 28, gap: 10 }}>
          {Platform.OS === 'ios' ? <SocialButton label={t('auth_apple')} icon="apple" filled onPress={onApple} /> : null}
          {Platform.OS !== 'ios' ? <SocialButton label={t('auth_google')} icon="google" onPress={onGoogle} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: MPAL.border }} />
            <MText variant="mono" size={10} color={MPAL.mute}>
              {t('auth_or')}
            </MText>
            <View style={{ flex: 1, height: 1, backgroundColor: MPAL.border }} />
          </View>
          <SocialButton label={t('auth_email')} icon="mail" onPress={() => router.push('/(auth)/signup')} />
        </View>

        <View style={{ marginTop: 'auto', paddingVertical: 28, alignItems: 'center' }}>
          <MText size={11} color={MPAL.mute} style={{ textAlign: 'center', lineHeight: 16, maxWidth: 300 }}>
            {t('auth_terms')}
          </MText>
          <MText size={13} color={MPAL.mute} style={{ marginTop: 14 }}>
            {t('auth_have_account')}{' '}
            <MText size={13} color={MPAL.ink} variant="bodySemibold" onPress={() => router.push('/(auth)/signin')} style={{ textDecorationLine: 'underline' }}>
              {t('auth_signin')}
            </MText>
          </MText>
        </View>
      </View>

      {busy || appleBusy ? (
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

function SocialButton({ label, icon, filled, onPress }: { label: string; icon: 'apple' | 'google' | 'mail'; filled?: boolean; onPress: () => void }) {
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

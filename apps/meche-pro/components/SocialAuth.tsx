import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { MIcon, MPAL, MText, useT } from '@meche/ui';
import { useAppleSignIn } from '../lib/useAppleSignIn';
import { useGoogleSignIn } from '../lib/useGoogleSignIn';

// Social sign-in block shared by the pro signin/signup screens. Same platform split as B2C:
// Apple on iOS, Google on Android — and Google only once its OAuth client ids are configured
// (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID set for the build).
const GOOGLE_CONFIGURED = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

export function useSocialAuth() {
  const { onApple, busy: appleBusy } = useAppleSignIn();
  const { onGoogle, busy: googleBusy } = useGoogleSignIn();
  const showApple = Platform.OS === 'ios';
  const showGoogle = Platform.OS === 'android' && GOOGLE_CONFIGURED;
  return { onApple, onGoogle, busy: appleBusy || googleBusy, showApple, showGoogle, any: showApple || showGoogle };
}

export function SocialButtons({ onApple, onGoogle, showApple, showGoogle }: { onApple: () => void; onGoogle: () => void; showApple: boolean; showGoogle: boolean }) {
  const t = useT();
  if (!showApple && !showGoogle) return null;
  return (
    <View style={{ marginTop: 20, gap: 10 }}>
      {showApple ? <SocialButton label={t('auth_apple')} icon="apple" filled onPress={onApple} /> : null}
      {showGoogle ? <SocialButton label={t('auth_google')} icon="google" onPress={onGoogle} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: MPAL.border }} />
        <MText variant="mono" size={10} color={MPAL.mute}>
          {t('auth_or')}
        </MText>
        <View style={{ flex: 1, height: 1, backgroundColor: MPAL.border }} />
      </View>
    </View>
  );
}

export function SocialBusyOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(252,248,244,0.86)', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <ActivityIndicator color={MPAL.ink} size="large" />
      <MText size={14} color={MPAL.mute}>
        Connexion…
      </MText>
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

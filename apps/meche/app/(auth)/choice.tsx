import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MIcon, MPAL, MText, MWordmark, MPortrait, useT } from '@meche/ui';

// Onboarding 01b · Compte (choix) — Apple / Google / email. Social providers need real
// client IDs (Phase 7); for now they explain that. Email continues to the form.
const COINS = [
  { hair: 'bob' as const, mood: 'warm' as const, dx: 0 },
  { hair: 'curly' as const, mood: 'blush' as const, dx: -18 },
  { hair: 'pixie' as const, mood: 'night' as const, dx: -18 },
];

export default function AuthChoice() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const soon = () => Alert.alert('Bientôt', 'Connexion Apple/Google à configurer (identifiants providers).');

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: 26 }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
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
              <MPortrait hair={c.hair} mood={c.mood} />
            </View>
          ))}
          <MText size={12} color={MPAL.mute} style={{ marginLeft: 8, maxWidth: 120, lineHeight: 17 }}>
            12 482 mèches gardées cette semaine
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
          <SocialButton label={t('auth_apple')} icon="apple" filled onPress={soon} />
          <SocialButton label={t('auth_google')} icon="google" onPress={soon} />
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

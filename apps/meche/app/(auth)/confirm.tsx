import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useAuth, useSupabase } from '@meche/api-client';
import { MIcon, MPAL, MText, MWordmark, PrimaryButton, useT } from '@meche/ui';

// Onboarding 01d · Vérification email. On local Supabase users are auto-confirmed, so
// "J'ai cliqué" just re-checks the session and proceeds.
export default function EmailConfirm() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const sb = useSupabase();
  const { resendConfirmation } = useAuth();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const proceed = async () => {
    const { data } = await sb.auth.getSession();
    if (data.session) router.replace('/(tabs)/explore');
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
          ÉTAPE 2 · VÉRIFICATION
        </MText>

        {/* envelope illustration */}
        <View style={{ height: 180, alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
          <View style={{ width: 180, height: 130, borderRadius: 14, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border, transform: [{ rotate: '-3deg' }] }}>
            <Svg width="100%" height="100%" viewBox="0 0 180 130" style={{ position: 'absolute' }}>
              <Path d="M2 8 L90 70 L178 8" fill="none" stroke={MPAL.border} strokeWidth={1.5} />
              <Path d="M2 122 L72 70 M178 122 L108 70" fill="none" stroke={MPAL.border} strokeWidth={1.5} />
            </Svg>
            <View style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 38, backgroundColor: MPAL.ink, borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
              <MWordmark size={12} color="#fff" accent="#fff" />
            </View>
          </View>
          <View style={{ position: 'absolute', top: 14, left: '54%' }}>
            <MIcon name="sparkle" size={22} color={MPAL.sable} fill={MPAL.sable} stroke={0} />
          </View>
        </View>

        <MText variant="serif" size={34} style={{ marginTop: 18, textAlign: 'center', lineHeight: 38 }}>
          {t('confirm_title')}
        </MText>
        <MText size={14} color={MPAL.mute} style={{ marginTop: 10, textAlign: 'center', lineHeight: 20 }}>
          {t('confirm_sub')}
          {'\n'}
          <MText size={14} color={MPAL.ink} variant="bodySemibold">
            {email ?? ''}
          </MText>
        </MText>

        <View style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: MPAL.soft }}>
          <MIcon name="mail" size={16} color={MPAL.ink} />
          <MText size={12} color={MPAL.ink2} style={{ flex: 1, lineHeight: 17 }}>
            {t('confirm_help')}
          </MText>
        </View>

        <View style={{ marginTop: 'auto', paddingBottom: insets.bottom + 24, gap: 10 }}>
          <PrimaryButton label={t('confirm_action')} tone="ink" icon="check" onPress={proceed} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <OutlineButton label={t('confirm_resend')} onPress={() => email && resendConfirmation(email)} />
            <OutlineButton label={t('confirm_change')} onPress={() => router.back()} />
          </View>
        </View>
      </View>
    </View>
  );
}

function OutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: MPAL.border, alignItems: 'center', opacity: pressed ? 0.7 : 1 })}
    >
      <MText variant="bodySemibold" size={13} color={MPAL.ink}>
        {label}
      </MText>
    </Pressable>
  );
}

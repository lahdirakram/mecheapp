import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useSession } from '@meche/api-client';
import { MPAL, MText, PWordmark, PrimaryButton, useLang } from '@meche/ui';

// A Mèche (client) account signed into the pro app. The two sides are strictly separate: block
// with an explanation instead of silently letting a B2C account build a salon.
export function NotAPro() {
  const insets = useSafeAreaInsets();
  const lang = useLang();
  const session = useSession();
  const { signOut } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 }}>
        <PWordmark size={34} />
        <MText variant="serif" size={26} style={{ textAlign: 'center', lineHeight: 30 }}>
          {lang === 'fr' ? 'Ce compte est un compte client.' : 'This is a client account.'}
        </MText>
        <MText size={14} color={MPAL.mute} style={{ textAlign: 'center', lineHeight: 21 }}>
          {lang === 'fr'
            ? 'Mèche Pro est réservé aux coiffeurs et utilise un compte séparé. Déconnecte-toi, puis crée ton compte pro avec un autre email. Ton compte client reste intact dans l’app Mèche.'
            : 'Mèche Pro is for stylists and uses a separate account. Sign out, then create your pro account with another email. Your client account stays untouched in the Mèche app.'}
        </MText>
        <MText size={12} color={MPAL.mute} style={{ textAlign: 'center' }} numberOfLines={1}>
          {session?.user.email ?? ''}
        </MText>
      </View>
      <View style={{ paddingHorizontal: 20 }}>
        <PrimaryButton label={lang === 'fr' ? 'Se déconnecter' : 'Sign out'} tone="ink" onPress={() => void signOut()} />
      </View>
    </View>
  );
}

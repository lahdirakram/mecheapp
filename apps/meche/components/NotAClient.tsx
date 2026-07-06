import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useSession } from '@meche/api-client';
import { MPAL, MText, MWordmark, PrimaryButton, useLang } from '@meche/ui';

// A Mèche Pro (stylist) account signed into the client app. The two sides are strictly separate:
// block with an explanation instead of showing a broken 0-credit client experience.
export function NotAClient() {
  const insets = useSafeAreaInsets();
  const lang = useLang();
  const session = useSession();
  const { signOut } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 }}>
        <MWordmark size={34} />
        <MText variant="serif" size={26} style={{ textAlign: 'center', lineHeight: 30 }}>
          {lang === 'fr' ? 'Ce compte est un compte pro.' : 'This is a pro account.'}
        </MText>
        <MText size={14} color={MPAL.mute} style={{ textAlign: 'center', lineHeight: 21 }}>
          {lang === 'fr'
            ? 'Cet email est lié à Mèche Pro (coiffeurs). Ouvre l’app Mèche Pro avec ce compte, ou déconnecte-toi et crée un compte client avec un autre email.'
            : 'This email belongs to Mèche Pro (stylists). Open the Mèche Pro app with this account, or sign out and create a client account with another email.'}
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

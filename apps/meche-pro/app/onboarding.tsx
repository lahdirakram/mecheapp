import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateSalon, useProfile, useSession } from '@meche/api-client';
import { MPAL, MText, PrimaryButton, TextField, useLang } from '@meche/ui';
import { NotAPro } from '../components/NotAPro';

// Onboarding pro · "Ton salon" — the minimal fiche that later powers the public page in the B2C
// app. Photos, services and horaires are edited from the Salon tab; here we only ask what's
// strictly needed to exist: salon, ville, prénom.
export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lang = useLang();
  const session = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const { mutateAsync: createSalon, isPending } = useCreateSalon();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [stylistName, setStylistName] = useState('');
  const valid = name.trim().length >= 2 && city.trim().length >= 2 && stylistName.trim().length >= 2;

  // Strict separation: a B2C (client) account never creates a salon (the DB refuses it too).
  if (profile && profile.role !== 'pro') return <NotAPro />;

  const submit = async () => {
    if (!valid || isPending || !session) return;
    try {
      await createSalon({ ownerId: session.user.id, name: name.trim(), city: city.trim(), stylistName: stylistName.trim() });
      router.replace('/(tabs)/studio');
    } catch (e) {
      Alert.alert('Oups', String((e as Error)?.message ?? e));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top + 16 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 26 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <MText variant="mono" size={10} color={MPAL.ink} style={{ letterSpacing: 1.4 }}>
          {lang === 'fr' ? 'ÉTAPE 2 · TON SALON' : 'STEP 2 · YOUR SALON'}
        </MText>
        <MText variant="serif" size={34} style={{ marginTop: 8, lineHeight: 38 }}>
          {lang === 'fr' ? 'Présente ton ' : 'Introduce your '}
          <MText variant="serifItalic" size={34}>
            salon
          </MText>
          .
        </MText>
        <MText size={14} color={MPAL.mute} style={{ marginTop: 8, lineHeight: 20 }}>
          {lang === 'fr' ? 'Photos, services et horaires se règlent après, dans l’onglet Salon.' : 'Photos, services and hours come later, in the Salon tab.'}
        </MText>

        <View style={{ marginTop: 24, gap: 14 }}>
          <TextField
            label={lang === 'fr' ? 'Nom du salon' : 'Salon name'}
            icon="settings"
            value={name}
            onChangeText={setName}
            placeholder={lang === 'fr' ? 'Atelier Mèche' : 'Atelier Mèche'}
          />
          <TextField
            label={lang === 'fr' ? 'Ville' : 'City'}
            icon="pin"
            value={city}
            onChangeText={setCity}
            placeholder="Paris"
          />
          <TextField
            label={lang === 'fr' ? 'Ton prénom' : 'Your first name'}
            icon="user"
            value={stylistName}
            onChangeText={setStylistName}
            placeholder={lang === 'fr' ? 'Lou' : 'Lou'}
            returnKeyType="go"
            onSubmitEditing={submit}
          />
        </View>

        <View style={{ marginTop: 'auto', paddingBottom: insets.bottom + 24 }}>
          <PrimaryButton label={isPending ? '…' : lang === 'fr' ? 'Créer mon salon' : 'Create my salon'} tone="ink" icon="arrowRight" disabled={!valid || isPending} onPress={submit} />
        </View>
      </ScrollView>
    </View>
  );
}

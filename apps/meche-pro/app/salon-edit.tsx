import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMySalon, useSaveServices, useSession, useUpdateSalon } from '@meche/api-client';
import { MIcon, MPAL, MText, PrimaryButton, TextField, TopBar, useLang, useToast } from '@meche/ui';

interface ServiceDraft {
  name: string;
  price_est: string;
}

// Salon · Ma fiche — everything the future public page shows: nom, ville, téléphone, horaires,
// bio, services avec prix. One screen, one save button; V1 keeps hours as free text.
export default function SalonEdit() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lang = useLang();
  const toast = useToast();
  const session = useSession();
  const { data: salon } = useMySalon(session?.user.id);
  const { mutateAsync: updateSalon, isPending: saving } = useUpdateSalon();
  const { mutateAsync: saveServices, isPending: savingServices } = useSaveServices();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('');
  const [bio, setBio] = useState('');
  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Seed the form once from the fetched salon (not on every refetch, to not clobber typing).
  useEffect(() => {
    if (!salon || loaded) return;
    setName(salon.name ?? '');
    setCity(salon.city ?? salon.area ?? '');
    setPhone(salon.phone ?? '');
    setHours(salon.hours_text ?? '');
    setBio(salon.bio ?? '');
    setServices((salon.services ?? []).map((s: { name: string; price_est: string | null }) => ({ name: s.name, price_est: s.price_est ?? '' })));
    setLoaded(true);
  }, [salon, loaded]);

  const setService = (i: number, field: keyof ServiceDraft, value: string) =>
    setServices((list) => list.map((s, j) => (j === i ? { ...s, [field]: value } : s)));

  const save = async () => {
    if (!salon || saving || savingServices) return;
    try {
      await updateSalon({ id: salon.id, name: name.trim(), city: city.trim(), phone: phone.trim(), hours_text: hours.trim(), bio: bio.trim() });
      await saveServices({
        salonId: salon.id,
        services: services.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), price_est: s.price_est.trim() || undefined })),
      });
      toast(lang === 'fr' ? 'Fiche enregistrée.' : 'Page saved.', { icon: 'check' });
      router.back();
    } catch {
      toast(lang === 'fr' ? 'Enregistrement impossible, réessaie.' : 'Could not save, try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top }}>
      <TopBar title={lang === 'fr' ? 'Ma fiche salon' : 'My salon page'} onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <TextField label={lang === 'fr' ? 'Nom du salon' : 'Salon name'} icon="settings" value={name} onChangeText={setName} placeholder="Atelier Mèche" />
        <TextField label={lang === 'fr' ? 'Ville' : 'City'} icon="pin" value={city} onChangeText={setCity} placeholder="Paris" />
        <TextField label={lang === 'fr' ? 'Téléphone' : 'Phone'} icon="mail" value={phone} onChangeText={setPhone} placeholder="06 12 34 56 78" keyboardType="phone-pad" />
        <TextField label={lang === 'fr' ? 'Horaires' : 'Hours'} icon="calendar" value={hours} onChangeText={setHours} placeholder={lang === 'fr' ? 'Mar. à Sam. · 9h à 19h' : 'Tue to Sat · 9am to 7pm'} />
        <TextField label={lang === 'fr' ? 'À propos' : 'About'} icon="sparkle" value={bio} onChangeText={setBio} placeholder={lang === 'fr' ? 'Spécialiste balayage et coupes courtes…' : 'Balayage and short-cut specialist…'} />

        {/* services */}
        <View style={{ marginTop: 6, gap: 10 }}>
          <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.4 }}>
            {lang === 'fr' ? 'SERVICES ET PRIX' : 'SERVICES AND PRICES'}
          </MText>
          {services.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={{ flex: 1.6 }}>
                <TextField value={s.name} onChangeText={(v) => setService(i, 'name', v)} placeholder={lang === 'fr' ? 'Coupe + brushing' : 'Cut + blow-dry'} />
              </View>
              <View style={{ flex: 1 }}>
                <TextField value={s.price_est} onChangeText={(v) => setService(i, 'price_est', v)} placeholder="45 €" />
              </View>
              <Pressable hitSlop={8} onPress={() => setServices((list) => list.filter((_, j) => j !== i))} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
                <MIcon name="x" size={14} color={MPAL.mute} />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() => setServices((list) => [...list, { name: '', price_est: '' }])}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: MPAL.border }}
          >
            <MIcon name="plus" size={14} color={MPAL.ink} />
            <MText variant="bodySemibold" size={13}>
              {lang === 'fr' ? 'Ajouter un service' : 'Add a service'}
            </MText>
          </Pressable>
        </View>

        <View style={{ marginTop: 10 }}>
          <PrimaryButton label={saving || savingServices ? '…' : lang === 'fr' ? 'Enregistrer' : 'Save'} tone="ink" icon="check" onPress={save} disabled={saving || savingServices || name.trim().length < 2} />
        </View>
      </ScrollView>
    </View>
  );
}

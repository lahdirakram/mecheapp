import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { useAddPortfolioItem, useDeletePortfolioItem, useMySalon, usePortfolio, useSession } from '@meche/api-client';
import { MIcon, MPAL, MText, PrimaryButton, TopBar, useLang, useToast } from '@meche/ui';
import { supabase } from '../lib/supabase';

interface PortfolioRow {
  id: string;
  name: string;
  image_path: string | null;
  created_at: string;
}

// Salon › Mes réalisations — the public portfolio. REAL photos only, added here after the actual
// cut (camera or gallery). AI renders are deliberately not publishable: the portfolio is proof of
// work, and these images are what the salon page in the B2C app will show.
export default function Realisations() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lang = useLang();
  const toast = useToast();
  const session = useSession();
  const { data: salon } = useMySalon(session?.user.id);
  const stylistId = salon?.stylists?.[0]?.id as string | undefined;
  const { data: items } = usePortfolio(stylistId);
  const { mutateAsync: addItem } = useAddPortfolioItem();
  const { mutate: deleteItem } = useDeletePortfolioItem();
  const [adding, setAdding] = useState(false);

  const list = ((items ?? []) as PortfolioRow[]).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));

  // The portfolio bucket is public — plain public URLs, no signing.
  const urlFor = (path: string | null) => (path ? supabase.storage.from('portfolio').getPublicUrl(path).data.publicUrl : null);

  // Add a REAL photo (after the cut): pick → upload under the pro's uid folder → portfolio row.
  const addPhoto = async (source: 'camera' | 'gallery') => {
    if (!stylistId || !session || adding) return;
    setAdding(true);
    try {
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, base64: false, allowsEditing: false };
      const res =
        source === 'camera'
          ? await (async () => {
              const perm = await ImagePicker.requestCameraPermissionsAsync();
              if (!perm.granted) {
                toast(lang === 'fr' ? 'Autorise la caméra dans les réglages.' : 'Allow the camera in settings.');
                return null;
              }
              return ImagePicker.launchCameraAsync(opts);
            })()
          : await ImagePicker.launchImageLibraryAsync(opts);
      if (!res || res.canceled || !res.assets?.[0]?.uri) return;
      const uri = res.assets[0].uri;
      // Bytes: RN fetch can't read file:// — go through expo-file-system on native, fetch on web.
      const bytes = Platform.OS === 'web' ? new Uint8Array(await (await fetch(uri)).arrayBuffer()) : await new File(uri).bytes();
      const d = new Date();
      const path = `${session.user.id}/reala-${d.getTime()}.jpg`;
      const { error: upErr } = await supabase.storage.from('portfolio').upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;
      const name =
        lang === 'fr'
          ? `Réalisation du ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
          : `Look, ${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      await addItem({ stylistId, name, imagePath: path });
      toast(lang === 'fr' ? 'Réalisation ajoutée.' : 'Look added.', { icon: 'check' });
    } catch {
      toast(lang === 'fr' ? 'Ajout impossible, réessaie.' : 'Could not add, try again.');
    } finally {
      setAdding(false);
    }
  };

  const pickSource = () => {
    if (Platform.OS === 'web') {
      void addPhoto('gallery');
      return;
    }
    Alert.alert(lang === 'fr' ? 'Ajouter une réalisation' : 'Add a look', lang === 'fr' ? 'Une vraie photo de ta coupe, avec l’accord de ta cliente. Elle sera visible sur ta fiche.' : 'A real photo of your cut, with your client’s consent. It will be visible on your page.', [
      { text: lang === 'fr' ? 'Prendre une photo' : 'Take a photo', onPress: () => void addPhoto('camera') },
      { text: lang === 'fr' ? 'Depuis la galerie' : 'From the gallery', onPress: () => void addPhoto('gallery') },
      { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmDelete = (item: PortfolioRow) =>
    Alert.alert(lang === 'fr' ? 'Retirer cette réalisation ?' : 'Remove this look?', undefined, [
      { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
      {
        text: lang === 'fr' ? 'Retirer' : 'Remove',
        style: 'destructive',
        onPress: () =>
          deleteItem(
            { id: item.id, imagePath: item.image_path },
            { onSuccess: () => toast(lang === 'fr' ? 'Réalisation retirée.' : 'Look removed.') },
          ),
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top }}>
      <TopBar
        title={lang === 'fr' ? 'Mes réalisations' : 'My work'}
        onBack={() => router.back()}
        right={
          <Pressable hitSlop={6} onPress={pickSource} disabled={adding} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: MPAL.ink, opacity: adding ? 0.5 : 1 }}>
            <MIcon name="plus" size={18} color="#fff" />
          </Pressable>
        }
      />
      {list.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 14 }}>
          <MIcon name="grid" size={28} color={MPAL.mute} />
          <MText variant="serif" size={22} style={{ textAlign: 'center' }}>
            {lang === 'fr' ? 'Montre ton travail.' : 'Show your work.'}
          </MText>
          <MText size={13} color={MPAL.mute} style={{ textAlign: 'center', lineHeight: 19 }}>
            {lang === 'fr'
              ? 'Ajoute de vraies photos de tes coupes, après le fauteuil. C’est cette galerie que les clientes verront sur ta fiche Mèche.'
              : 'Add real photos of your cuts, after the chair. This gallery is what clients will see on your Mèche page.'}
          </MText>
          <View style={{ alignSelf: 'stretch', marginTop: 6 }}>
            <PrimaryButton label={adding ? '…' : lang === 'fr' ? 'Ajouter une photo' : 'Add a photo'} tone="caramel" icon="plus" onPress={pickSource} disabled={adding} />
          </View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {list.map((item) => {
              const uri = urlFor(item.image_path);
              return (
                <View key={item.id} style={{ width: '48%', flexGrow: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: MPAL.border, backgroundColor: MPAL.paper }}>
                  <View style={{ aspectRatio: 3 / 4 }}>
                    {uri ? <Image source={{ uri }} style={{ flex: 1 }} contentFit="cover" transition={200} /> : null}
                    <Pressable
                      hitSlop={6}
                      onPress={() => confirmDelete(item)}
                      style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <MIcon name="trash" size={14} color="#fff" />
                    </Pressable>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                    <MText variant="bodySemibold" size={12} numberOfLines={1}>
                      {item.name}
                    </MText>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

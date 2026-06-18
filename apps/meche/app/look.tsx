import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MIcon, MPAL, MText, MPortrait, useLang } from '@meche/ui';
import { useTryStore } from '../lib/tryStore';

// Look detail (from "Mes mèches"). A feed-saved look is an inspiration photo → "Essayer ce look".
// A generated essai shows the produced image → book / share. (No before/after here — the
// before/after lives in the live try-on flow.)
export default function LookDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lang = useLang();
  const setBrief = useTryStore((s) => s.setBrief);
  const setDirect = useTryStore((s) => s.setDirect);
  const { name = '', image = '', gen = '0' } = useLocalSearchParams<{ name?: string; image?: string; gen?: string }>();
  const isEssai = gen === '1';

  const tryThis = () => {
    setBrief({ lookName: name });
    setDirect(true);
    router.replace('/try'); // selfie → generation
  };
  const book = () => {
    router.back();
    router.navigate('/(tabs)/salons');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {image ? <Image source={{ uri: image }} style={{ flex: 1 }} contentFit="cover" /> : <MPortrait hair="bob" mood="warm" tint={MPAL.ink} />}
      </View>
      <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent', 'transparent', 'rgba(0,0,0,0.9)']} locations={[0, 0.2, 0.5, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none" />

      {/* close */}
      <View style={{ position: 'absolute', top: insets.top + 8, right: 16 }}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <MIcon name="x" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* info + actions */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingBottom: insets.bottom + 24 }}>
        <MText variant="mono" size={10} color="rgba(255,255,255,0.8)" style={{ letterSpacing: 1.4, marginBottom: 6 }}>
          {isEssai ? (lang === 'fr' ? '✦ TON ESSAI' : '✦ YOUR TRY') : lang === 'fr' ? 'ENREGISTRÉE' : 'SAVED'}
        </MText>
        <MText variant="serif" size={32} color="#fff" style={{ lineHeight: 34 }}>
          {name}
        </MText>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          {isEssai ? (
            <>
              <Pressable onPress={book} style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 999, backgroundColor: '#fff' }}>
                <MIcon name="pin" size={15} color={MPAL.ink} />
                <MText variant="bodySemibold" size={14} color={MPAL.ink}>
                  {lang === 'fr' ? 'Réserver' : 'Book'}
                </MText>
              </Pressable>
              <Pressable onPress={() => router.push('/share')} style={{ width: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
                <MIcon name="share" size={18} color="#fff" />
              </Pressable>
            </>
          ) : (
            <>
              <Pressable onPress={tryThis} style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 999, backgroundColor: '#fff' }}>
                <MIcon name="sparkle" size={15} color={MPAL.ink} />
                <MText variant="bodySemibold" size={14} color={MPAL.ink}>
                  {lang === 'fr' ? 'Essayer ce look' : 'Try this look'}
                </MText>
              </Pressable>
              <Pressable onPress={book} style={{ paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
                <MText variant="bodySemibold" size={13} color="#fff">
                  {lang === 'fr' ? 'Réserver' : 'Book'}
                </MText>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

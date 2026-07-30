import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Defs, Ellipse, Mask, Rect } from 'react-native-svg';
import { MIcon, MPAL, MText, MPortrait, useLang, useToast } from '@meche/ui';
import { useTryStore } from '../../lib/tryStore';
import { useExitTry } from '../../lib/useExitTry';
import { shrinkSelfie } from '../../lib/selfie';

// Pro · Selfie de la cliente — live viewfinder with the dashed caramel oval guide, ported from the
// B2C selfie screen. Default camera is the BACK one: the stylist shoots the client, not themself.
const ACCENT = MPAL.sable;
// Oval kept deliberately small so the client's WHOLE head + hair fits inside it (a tight oval
// crops the hairstyle, which is exactly what the AI needs to restyle).
const OVAL = { cx: 201, cy: 372, rx: 128, ry: 176 };

type Shot = { uri: string; base64: string; mime: string };

// Shared dashed-oval framing guide — drawn over the live camera AND over the review preview.
function OvalGuide() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 402 874" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute' }} pointerEvents="none">
      <Defs>
        <Mask id="oval">
          <Rect width="402" height="874" fill="white" />
          <Ellipse cx={OVAL.cx} cy={OVAL.cy} rx={OVAL.rx} ry={OVAL.ry} fill="black" />
        </Mask>
      </Defs>
      <Rect width="402" height="874" fill="rgba(0,0,0,0.6)" mask="url(#oval)" />
      <Ellipse cx={OVAL.cx} cy={OVAL.cy} rx={OVAL.rx} ry={OVAL.ry} fill="none" stroke={ACCENT} strokeWidth={2} strokeDasharray="6 6" />
    </Svg>
  );
}

export default function ClientSelfie() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lang = useLang();
  const toast = useToast();
  const [flash, setFlash] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const setSelfie = useTryStore((s) => s.setSelfie);
  const exitTry = useExitTry();

  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState<Shot | null>(null);

  const granted = permission?.granted ?? false;

  useEffect(() => {
    if (Platform.OS !== 'web' && permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  const askCamera = async () => {
    const res = await requestPermission();
    if (!res?.granted) toast(lang === 'fr' ? 'Autorise la caméra dans les réglages pour la photo.' : 'Allow the camera in settings for the photo.');
  };

  const splitDataUri = (raw: string, fallbackMime: string) => {
    const m = raw.match(/^data:(.+?);base64,(.*)$/s);
    return m ? { base64: m[2], mime: m[1] } : { base64: raw, mime: fallbackMime };
  };

  // Ramène la photo à 1024px de côté long (lib/selfie.ts). FAIL-OPEN : si la réduction échoue, on
  // part avec l'original plutôt que de bloquer un coiffeur devant son client. C'est pour ça que
  // `base64: true` reste demandé malgré son coût : il sert de repli.
  const shrinkOrKeep = async (uri: string | undefined, base64: string, mime: string, w?: number, h?: number) => {
    if (!uri) return { base64, mime };
    try {
      return await shrinkSelfie(uri, w, h);
    } catch {
      return { base64, mime };
    }
  };

  const capture = async () => {
    if (busy || !granted || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: true });
      if (photo?.base64) {
        const raw = splitDataUri(photo.base64, 'image/jpeg');
        const { base64, mime } = await shrinkOrKeep(photo.uri, raw.base64, raw.mime, photo.width, photo.height);
        setShot({ uri: photo.uri ?? `data:${mime};base64,${base64}`, base64, mime });
      } else {
        toast(lang === 'fr' ? 'Capture impossible, réessaie.' : 'Capture failed, try again.');
      }
    } catch {
      toast(lang === 'fr' ? 'Capture impossible, réessaie.' : 'Capture failed, try again.');
    } finally {
      setBusy(false);
    }
  };

  const pickFromGallery = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
      if (res.canceled || !res.assets?.[0]?.base64) return;
      const asset = res.assets[0];
      // La galerie est le pire cas : un import peut être un 48 Mpx ou un export ProRAW, là où le
      // capteur plafonne. Même réduction, même repli.
      const raw = splitDataUri(asset.base64 as string, asset.mimeType ?? 'image/jpeg');
      const { base64, mime } = await shrinkOrKeep(asset.uri, raw.base64, raw.mime, asset.width, asset.height);
      setShot({ uri: asset.uri, base64, mime });
    } catch {
      toast(lang === 'fr' ? 'Import impossible.' : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const confirmShot = () => {
    if (!shot) return;
    setSelfie(shot.base64, shot.mime);
    setFlash(true);
    setTimeout(() => {
      setFlash(false);
      router.push('/try/idea');
    }, 300);
  };

  const hint = lang === 'fr' ? 'Tête et cheveux dans l’ovale' : 'Head and hair inside the oval';

  // ── Review state ────────────────────────────────────────────────────────────────────────────────
  if (shot) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0908' }}>
        <Image source={{ uri: shot.uri }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.15)' }} />
        <OvalGuide />

        <Pressable hitSlop={8} onPress={() => exitTry()} style={{ position: 'absolute', top: insets.top + 8, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <MIcon name="x" size={18} color="#fff" />
        </Pressable>

        <View style={{ position: 'absolute', top: insets.top + 16, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)' }}>
            <View style={{ width: 6, height: 6, borderRadius: 6, backgroundColor: ACCENT }} />
            <MText variant="bodyMedium" size={12} color={MPAL.ink}>
              {hint}
            </MText>
          </View>
          <MText variant="serif" size={26} color="#fff" style={{ marginTop: 14 }}>
            {lang === 'fr' ? 'On garde celle-ci ?' : 'Keep this one?'}
          </MText>
        </View>

        {flash ? <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', opacity: 0.8 }} /> : null}

        <View style={{ position: 'absolute', bottom: insets.bottom + 40, left: 20, right: 20, flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => setShot(null)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
          >
            <MIcon name="cam" size={16} color="#fff" />
            <MText variant="bodySemibold" size={15} color="#fff">
              {lang === 'fr' ? 'Reprendre' : 'Retake'}
            </MText>
          </Pressable>
          <Pressable
            onPress={confirmShot}
            style={{ flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 999, backgroundColor: ACCENT }}
          >
            <MText variant="bodySemibold" size={15} color="#fff">
              {lang === 'fr' ? 'Continuer' : 'Continue'}
            </MText>
            <MIcon name="arrowRight" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Capture state ───────────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0908' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {granted ? (
          <CameraView ref={cameraRef} facing={facing} style={{ flex: 1 }} />
        ) : (
          <MPortrait hair="medium" mood="warm" label="viseur" />
        )}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: granted ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.35)' }} />
      </View>

      <OvalGuide />

      <View style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable hitSlop={8} onPress={() => exitTry()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <MIcon name="x" size={18} color="#fff" />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)' }}>
          <View style={{ width: 6, height: 6, borderRadius: 6, backgroundColor: ACCENT }} />
          <MText variant="bodyMedium" size={12} color={MPAL.ink}>
            {hint}
          </MText>
        </View>
        <Pressable hitSlop={8} onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <MIcon name="flip" size={18} color="#fff" />
        </Pressable>
      </View>

      <View style={{ position: 'absolute', top: insets.top + 70, left: 0, right: 0, alignItems: 'center' }}>
        <MText variant="serif" size={32} color="#fff">
          {lang === 'fr' ? 'Photo de ta cliente' : 'Your client’s photo'}
        </MText>
        {!granted ? (
          <Pressable onPress={askCamera} style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: ACCENT }}>
            <MText variant="bodySemibold" size={13} color="#fff">
              {lang === 'fr' ? 'Autoriser la caméra' : 'Allow the camera'}
            </MText>
          </Pressable>
        ) : null}
      </View>

      <View style={{ position: 'absolute', bottom: insets.bottom + 38, left: 0, right: 0, alignItems: 'center' }}>
        <Pressable
          onPress={pickFromGallery}
          disabled={busy}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
        >
          {busy ? <ActivityIndicator size="small" color="#fff" /> : <MIcon name="image" size={16} color="#fff" />}
          <MText variant="bodySemibold" size={13} color="#fff">
            {lang === 'fr' ? 'Importer une photo' : 'Import a photo'}
          </MText>
        </Pressable>
      </View>

      <View style={{ position: 'absolute', bottom: insets.bottom + 96, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Pressable onPress={capture} disabled={busy || !granted} style={{ width: 82, height: 82, borderRadius: 41, borderWidth: 5, borderColor: '#fff', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', opacity: !granted ? 0.5 : 1 }}>
          {busy ? <ActivityIndicator color={ACCENT} /> : <View style={{ width: '86%', height: '86%', borderRadius: 999, backgroundColor: ACCENT }} />}
        </Pressable>
      </View>
    </View>
  );
}

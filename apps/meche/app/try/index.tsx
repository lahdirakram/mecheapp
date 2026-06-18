import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Defs, Ellipse, Mask, Rect } from 'react-native-svg';
import { MIcon, MPAL, MText, MPortrait, useT, useToast } from '@meche/ui';
import { useTryStore } from '../../lib/tryStore';

// B2C · Selfie (02) — live camera viewfinder with a dashed caramel oval guide. Uses the real
// device camera (expo-camera); falls back to the MPortrait placeholder when permission is
// denied/unavailable (e.g. web preview without a camera). Capture → flash → next.
const ACCENT = MPAL.sable; // selfie screen uses caramel locally (per source)

export default function Selfie() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const [flash, setFlash] = useState(false);
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const setSelfie = useTryStore((s) => s.setSelfie);
  const directMode = useTryStore((s) => s.directMode);

  const granted = permission?.granted ?? false;

  // Auto-ask on native (the OS dialog works without a gesture). On web, getUserMedia must be
  // triggered by a user tap, so we wait for the "Autoriser la caméra" button instead.
  useEffect(() => {
    if (Platform.OS !== 'web' && permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  const askCamera = async () => {
    const res = await requestPermission();
    if (!res?.granted) {
      toast(
        Platform.OS === 'web'
          ? 'Autorise la caméra dans la barre du navigateur, puis recharge.'
          : 'Autorise la caméra dans les réglages pour ton selfie.',
      );
    }
  };

  // directMode → a specific look was chosen ("Essayer ce look"): after the selfie, generate it
  // straight away instead of showing "Ton idée".
  const next = directMode ? '/try/generating' : '/try/idea';

  const capture = async () => {
    try {
      if (granted && cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: true });
        if (photo?.base64) {
          // expo-camera returns a `data:<mime>;base64,…` prefix on web; strip it + keep the real mime.
          let b64 = photo.base64;
          let mime = 'image/jpeg';
          const m = b64.match(/^data:(.+?);base64,(.*)$/s);
          if (m) {
            mime = m[1];
            b64 = m[2];
          }
          setSelfie(b64, mime);
        }
      }
    } catch {
      // capture can fail without a real camera (web/headless) — still advance the flow
    }
    advance();
  };

  const advance = () => {
    setFlash(true);
    setTimeout(() => {
      setFlash(false);
      router.push(next);
    }, 360);
  };

  // Import a photo from the gallery instead of taking a selfie. On Android 13+ this is the system
  // photo picker (no permission prompt). Used as-is — the AI restyles the hair regardless of framing.
  const pickFromGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
      if (res.canceled || !res.assets?.[0]?.base64) return;
      const asset = res.assets[0];
      let b64 = asset.base64 as string;
      let mime = asset.mimeType ?? 'image/jpeg';
      const m = b64.match(/^data:(.+?);base64,(.*)$/s);
      if (m) {
        mime = m[1];
        b64 = m[2];
      }
      setSelfie(b64, mime);
      advance();
    } catch {
      toast('Import impossible.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0908' }}>
      {/* viewfinder: live camera, or placeholder when unavailable */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {granted ? (
          <CameraView ref={cameraRef} facing={facing} style={{ flex: 1 }} />
        ) : (
          <MPortrait hair="medium" mood="warm" label="viseur" />
        )}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: granted ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.35)' }} />
      </View>

      {/* oval guide */}
      <Svg width="100%" height="100%" viewBox="0 0 402 874" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute' }} pointerEvents="none">
        <Defs>
          <Mask id="oval">
            <Rect width="402" height="874" fill="white" />
            <Ellipse cx="201" cy="380" rx="155" ry="220" fill="black" />
          </Mask>
        </Defs>
        <Rect width="402" height="874" fill="rgba(0,0,0,0.6)" mask="url(#oval)" />
        <Ellipse cx="201" cy="380" rx="155" ry="220" fill="none" stroke={ACCENT} strokeWidth={2} strokeDasharray="6 6" />
      </Svg>

      {/* top bar */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <MIcon name="x" size={18} color="#fff" />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)' }}>
          <View style={{ width: 6, height: 6, borderRadius: 6, backgroundColor: ACCENT }} />
          <MText variant="bodyMedium" size={12} color={MPAL.ink}>
            {t('selfie_hint')}
          </MText>
        </View>
        <Pressable hitSlop={8} onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <MIcon name="flip" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* title */}
      <View style={{ position: 'absolute', top: insets.top + 70, left: 0, right: 0, alignItems: 'center' }}>
        <MText variant="serif" size={32} color="#fff">
          {t('take_selfie')}
        </MText>
        {!granted ? (
          <Pressable onPress={askCamera} style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: ACCENT }}>
            <MText variant="bodySemibold" size={13} color="#fff">
              Autoriser la caméra
            </MText>
          </Pressable>
        ) : null}
      </View>

      {flash ? <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', opacity: 0.8 }} /> : null}

      {/* hint: a photo is required (camera or gallery) — no skip */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 44, left: 0, right: 0, alignItems: 'center' }}>
        <MText size={12} color="rgba(255,255,255,0.6)">
          Prends un selfie ou importe une photo
        </MText>
      </View>

      {/* shutter row */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 96, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
        <View style={{ width: 54, height: 54 }} />{/* spacer keeps the shutter centered */}
        <Pressable onPress={capture} style={{ width: 82, height: 82, borderRadius: 41, borderWidth: 5, borderColor: '#fff', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: '86%', height: '86%', borderRadius: 999, backgroundColor: ACCENT }} />
        </Pressable>
        <Pressable onPress={pickFromGallery} style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
          <MIcon name="image" size={20} color="#fff" />
        </Pressable>
      </View>

    </View>
  );
}

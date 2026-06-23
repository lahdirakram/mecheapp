import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Defs, Ellipse, Mask, Rect } from 'react-native-svg';
import { MIcon, MPAL, MText, MPortrait, useT, useToast } from '@meche/ui';
import { useTryStore } from '../../lib/tryStore';

// B2C · Selfie (02) — live camera viewfinder with a dashed caramel oval guide. Uses the real
// device camera (expo-camera); falls back to the MPortrait placeholder when permission is
// denied/unavailable (e.g. web preview without a camera). Capture → REVIEW (validate/retake) → next.
const ACCENT = MPAL.sable; // selfie screen uses caramel locally (per source)
// Oval kept deliberately small so the user steps back and frames their WHOLE head + hair inside it
// (a tight oval crops the hairstyle, which is exactly what the AI needs to restyle).
const OVAL = { cx: 201, cy: 372, rx: 128, ry: 176 };

type Shot = { uri: string; base64: string; mime: string };

// Shared dashed-oval framing guide — drawn over the live camera AND over the review preview, so the
// user can check the same framing on the photo they're about to send.
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
  const surprise = useTryStore((s) => s.surprise);

  // `busy` guards against the double-tap that fires a second capture/import before the first
  // settles. `shot` holds the captured/imported photo while the user reviews it (validate/retake).
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState<Shot | null>(null);

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

  // After the selfie: a specific look ("Essayer ce look") generates straight away; "coupe surprise"
  // hands off to the dedicated "L'IA te propose" screen; otherwise the "Ton idée" prompt hub.
  const next = directMode ? '/try/generating' : surprise ? '/try/aipropose' : '/try/idea';

  // Strip the `data:<mime>;base64,…` prefix expo returns on web; keep the real mime.
  const splitDataUri = (raw: string, fallbackMime: string) => {
    const m = raw.match(/^data:(.+?);base64,(.*)$/s);
    return m ? { base64: m[2], mime: m[1] } : { base64: raw, mime: fallbackMime };
  };

  const capture = async () => {
    if (busy || !granted || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: true });
      if (photo?.base64) {
        const { base64, mime } = splitDataUri(photo.base64, 'image/jpeg');
        setShot({ uri: photo.uri ?? `data:${mime};base64,${base64}`, base64, mime });
      } else {
        toast('Capture impossible, réessaie.');
      }
    } catch {
      toast('Capture impossible, réessaie.');
    } finally {
      setBusy(false);
    }
  };

  // Import a photo from the gallery instead of taking a selfie. On Android 13+ this is the system
  // photo picker (no permission prompt). Used as-is — the AI restyles the hair regardless of framing.
  const pickFromGallery = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
      if (res.canceled || !res.assets?.[0]?.base64) return;
      const asset = res.assets[0];
      const { base64, mime } = splitDataUri(asset.base64 as string, asset.mimeType ?? 'image/jpeg');
      setShot({ uri: asset.uri, base64, mime });
    } catch {
      toast('Import impossible.');
    } finally {
      setBusy(false);
    }
  };

  // Validate the reviewed photo → store it and advance with a quick flash.
  const confirmShot = () => {
    if (!shot) return;
    setSelfie(shot.base64, shot.mime);
    setFlash(true);
    setTimeout(() => {
      setFlash(false);
      router.push(next);
    }, 300);
  };

  // ── Review state: the user checks the captured/imported photo before it's sent ──────────────────
  if (shot) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0908' }}>
        <Image source={{ uri: shot.uri }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.15)' }} />
        <OvalGuide />

        {/* close — exits the flow, same as the camera screen */}
        <Pressable hitSlop={8} onPress={() => router.back()} style={{ position: 'absolute', top: insets.top + 8, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <MIcon name="x" size={18} color="#fff" />
        </Pressable>

        {/* keep the framing hint so the user can confirm the photo meets the criteria */}
        <View style={{ position: 'absolute', top: insets.top + 16, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)' }}>
            <View style={{ width: 6, height: 6, borderRadius: 6, backgroundColor: ACCENT }} />
            <MText variant="bodyMedium" size={12} color={MPAL.ink}>
              {t('selfie_hint')}
            </MText>
          </View>
          <MText variant="serif" size={26} color="#fff" style={{ marginTop: 14 }}>
            {t('photo_review')}
          </MText>
        </View>

        {flash ? <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', opacity: 0.8 }} /> : null}

        {/* retake / confirm */}
        <View style={{ position: 'absolute', bottom: insets.bottom + 40, left: 20, right: 20, flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => setShot(null)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
          >
            <MIcon name="cam" size={16} color="#fff" />
            <MText variant="bodySemibold" size={15} color="#fff">
              {t('photo_retake')}
            </MText>
          </Pressable>
          <Pressable
            onPress={confirmShot}
            style={{ flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 999, backgroundColor: ACCENT }}
          >
            <MText variant="bodySemibold" size={15} color="#fff">
              {t('photo_confirm')}
            </MText>
            <MIcon name="arrowRight" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Capture state: live viewfinder ──────────────────────────────────────────────────────────────
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
      <OvalGuide />

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

      {/* import a photo — a labelled button (clearer than a bare icon) */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 38, left: 0, right: 0, alignItems: 'center' }}>
        <Pressable
          onPress={pickFromGallery}
          disabled={busy}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
        >
          {busy ? <ActivityIndicator size="small" color="#fff" /> : <MIcon name="image" size={16} color="#fff" />}
          <MText variant="bodySemibold" size={13} color="#fff">
            {t('import_photo')}
          </MText>
        </Pressable>
      </View>

      {/* shutter — shows an inline spinner while capturing rather than just looking disabled */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 96, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Pressable onPress={capture} disabled={busy || !granted} style={{ width: 82, height: 82, borderRadius: 41, borderWidth: 5, borderColor: '#fff', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', opacity: !granted ? 0.5 : 1 }}>
          {busy ? <ActivityIndicator color={ACCENT} /> : <View style={{ width: '86%', height: '86%', borderRadius: 999, backgroundColor: ACCENT }} />}
        </Pressable>
      </View>
    </View>
  );
}

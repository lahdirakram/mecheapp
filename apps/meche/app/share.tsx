import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Share as RNShare, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGeneration } from '@meche/api-client';
import { MIcon, MPAL, MText, MWordmark, MPortrait, useLang, useT, useToast } from '@meche/ui';
import { cacheKeyFor } from '../lib/img';
import { localFirstUri, useLocalImage } from '../lib/localImages';

// The watermarked share card (after-only, or before/after top-bottom split). `s` scales the chrome.
// This same on-screen node is captured to a PNG, so what you preview is exactly what you share.
const Card = React.forwardRef<View, { w: number; withBefore: boolean; beforeUri: string | null; afterUri: string | null; name: string }>(
  ({ w, withBefore, beforeUri, afterUri, name }, ref) => {
    const t = useT();
    const h = (w * 16) / 9;
    const s = w / 360;
    const After = afterUri ? <Image source={{ uri: afterUri, cacheKey: cacheKeyFor(afterUri) }} style={{ flex: 1 }} contentFit="cover" contentPosition="center" cachePolicy="memory-disk" /> : <MPortrait hair="bob" mood="warm" tint={MPAL.ink} />;
    const Before = beforeUri ? <Image source={{ uri: beforeUri, cacheKey: cacheKeyFor(beforeUri) }} style={{ flex: 1 }} contentFit="cover" contentPosition="center" cachePolicy="memory-disk" /> : <MPortrait hair="medium" mood="warm" />;
    const Tag = ({ text, side }: { text: string; side: 'l' | 'r' }) => (
      <View style={{ position: 'absolute', top: 12 * s, left: side === 'l' ? 12 * s : undefined, right: side === 'r' ? 12 * s : undefined, paddingHorizontal: 9 * s, paddingVertical: 4 * s, borderRadius: 6 * s, backgroundColor: side === 'l' ? 'rgba(255,255,255,0.92)' : MPAL.sable }}>
        <MText variant="bodyBold" size={11 * s} color={side === 'l' ? MPAL.ink : '#fff'} style={{ letterSpacing: 1 * s }}>
          {text}
        </MText>
      </View>
    );
    return (
      <View ref={ref} collapsable={false} style={{ width: w, height: h, backgroundColor: MPAL.ink, overflow: 'hidden' }}>
        {withBefore ? (
          <>
            <View style={{ flex: 1 }}>
              {Before}
              <Tag text={t('before').toUpperCase()} side="l" />
            </View>
            <View style={{ flex: 1 }}>
              {After}
              <Tag text={t('after').toUpperCase()} side="r" />
            </View>
            <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: Math.max(1, 2 * s), backgroundColor: 'rgba(255,255,255,0.7)' }} />
          </>
        ) : (
          <>
            {After}
            <View style={{ position: 'absolute', top: 12 * s, right: 12 * s, paddingHorizontal: 9 * s, paddingVertical: 4 * s, borderRadius: 6 * s, backgroundColor: MPAL.sable }}>
              <MText variant="bodyBold" size={11 * s} color="#fff" style={{ letterSpacing: 1 * s }}>
                ✦ MÈCHE
              </MText>
            </View>
          </>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 30 * s, paddingHorizontal: 16 * s, paddingBottom: 14 * s }}>
          <MWordmark size={22 * s} color="#fff" accent={MPAL.sable} />
          <MText size={9 * s} color="rgba(255,255,255,0.82)" style={{ marginTop: 3 * s }} numberOfLines={1}>
            {name}
          </MText>
        </LinearGradient>
      </View>
    );
  },
);
Card.displayName = 'ShareCard';

// B2C · Partage (19) — shares/copies the generated look as a watermarked PNG (captured from the
// on-screen card at native resolution). Toggle adds the before photo as a top/bottom split.
export default function Share() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const params = useLocalSearchParams<{ name?: string; generationId?: string; after?: string }>();
  const { width: screenW, height: screenH } = useWindowDimensions();
  // Size by BOTH width and the space left between header/subtitle and the toggle/buttons, so the
  // 9:16 card never overflows and hides the page text.
  const cardW = Math.max(210, Math.min(screenW - 40, Math.round(((screenH - 360) * 9) / 16)));
  const [busy, setBusy] = useState<null | 'share' | 'save'>(null);
  const [withBefore, setWithBefore] = useState(false);
  const cardRef = useRef<View>(null);

  // Deterministic: the shared card is the generation identified by the params (signed URLs), with the
  // `after` param as a fallback when it's already a full URL.
  const { data: gen } = useGeneration(params.generationId);
  // Prefer the durable local copy (downloaded once); fall back to the signed URL only on a cache miss.
  const beforeLocal = useLocalImage('selfies', gen?.selfiePath);
  const afterLocal = useLocalImage('generated', gen?.resultPath);
  const beforeUri = localFirstUri(beforeLocal, gen?.selfieUrl ?? null);
  const afterUri = localFirstUri(afterLocal, gen?.resultUrl ?? (params.after || null));
  const lookName = params.name ?? (lang === 'fr' ? 'Ma mèche' : 'My look');

  // Pre-capture the on-screen card to a PNG file in the background (native resolution) so Share/Save
  // are instant — the same file is shared or saved to Photos.
  const capRef = useRef<string | null>(null);
  const capture = async () => captureRef(cardRef, { format: 'png', quality: 1 });
  useEffect(() => {
    let cancelled = false;
    capRef.current = null;
    if (!afterUri) return;
    const id = setTimeout(async () => {
      try {
        const file = await capture();
        if (!cancelled) capRef.current = file;
      } catch {
        /* fall back to capturing on press */
      }
    }, 500); // let the card + its images settle
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [afterUri, beforeUri, withBefore, lookName]);

  const ensure = async () => capRef.current ?? (capRef.current = await capture());

  const guard = () => {
    if (busy) return false;
    if (!afterUri) {
      toast(lang === 'fr' ? 'Aperçu en cours de chargement…' : 'Preview still loading…');
      return false;
    }
    return true;
  };

  const onShare = async () => {
    if (!guard()) return;
    setBusy('share');
    try {
      const file = await ensure();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file, { mimeType: 'image/png', dialogTitle: lang === 'fr' ? 'Partager ma mèche' : 'Share my look', UTI: 'public.png' });
      } else {
        await RNShare.share({ url: file });
      }
    } catch {
      toast(lang === 'fr' ? 'Partage indisponible.' : 'Sharing unavailable.');
    } finally {
      setBusy(null);
    }
  };

  const onSave = async () => {
    if (!guard()) return;
    if (Platform.OS === 'web') {
      toast(lang === 'fr' ? 'Indisponible sur le web.' : 'Not available on web.');
      return;
    }
    setBusy('save');
    try {
      // Lazy-loaded: expo-media-library's native module isn't available on web, and a top-level
      // import would crash the whole web bundle.
      const MediaLibrary = await import('expo-media-library');
      const perm = await MediaLibrary.requestPermissionsAsync(false, ['photo']); // photos only, no audio/video prompt
      if (!perm.granted) {
        toast(lang === 'fr' ? 'Autorise l’accès aux photos pour enregistrer.' : 'Allow photo access to save.');
        return;
      }
      let file = await ensure();
      if (!/^[a-z]+:\/\//i.test(file)) file = `file://${file}`; // view-shot may return a bare path
      await MediaLibrary.Asset.create(file); // SDK 56 class-based API (saveToLibraryAsync now throws)
      toast(lang === 'fr' ? 'Photo enregistrée.' : 'Saved to Photos.');
    } catch (e) {
      const msg = String((e as Error)?.message ?? e).slice(0, 90);
      toast((lang === 'fr' ? 'Échec : ' : 'Failed: ') + msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top + 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
          <MIcon name="chevronLeft" size={18} color={MPAL.ink} />
        </Pressable>
        <MText variant="serif" size={30} style={{ marginLeft: 8 }}>
          {t('share')}
        </MText>
      </View>

      <MText size={13} color={MPAL.mute} style={{ textAlign: 'center', paddingHorizontal: 24, marginTop: 4 }}>
        {lang === 'fr' ? 'Ta photo, signée Mèche.' : 'Your photo, signed Mèche.'}
      </MText>

      {/* preview = capture target (on-screen so view-shot can draw it; white border sits on the
          wrapper, outside the captured node) */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
        <View style={{ borderRadius: 22, overflow: 'hidden', borderWidth: 6, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 26, shadowOffset: { width: 0, height: 14 } }}>
          <Card ref={cardRef} w={cardW} withBefore={withBefore} beforeUri={beforeUri} afterUri={afterUri} name={lookName} />
        </View>
      </View>

      {/* include-before toggle */}
      <Pressable onPress={() => setWithBefore((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 18, padding: 14, borderRadius: 16, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border }}>
        <View style={{ width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: withBefore ? MPAL.ink : 'transparent', borderWidth: withBefore ? 0 : 1.5, borderColor: MPAL.border }}>
          {withBefore ? <MIcon name="check" size={15} color="#fff" /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <MText variant="bodySemibold" size={13}>
            {lang === 'fr' ? 'Inclure la photo avant' : 'Include the before photo'}
          </MText>
          <MText size={11} color={MPAL.mute} style={{ marginTop: 1 }}>
            {lang === 'fr' ? 'Montre l’avant / après en haut / bas.' : 'Shows before / after, top / bottom.'}
          </MText>
        </View>
      </Pressable>

      {/* actions */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 12, paddingBottom: insets.bottom + 20 }}>
        <Pressable onPress={onShare} disabled={!!busy} style={{ flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 999, backgroundColor: MPAL.ink, opacity: busy ? 0.6 : 1 }}>
          <MIcon name="share" size={16} color="#fff" />
          <MText variant="bodySemibold" size={14} color="#fff">
            {busy === 'share' ? (lang === 'fr' ? 'Préparation…' : 'Preparing…') : lang === 'fr' ? 'Partager' : 'Share'}
          </MText>
        </Pressable>
        <Pressable onPress={onSave} disabled={!!busy} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 999, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border, opacity: busy ? 0.6 : 1 }}>
          <MIcon name="download" size={16} color={MPAL.ink} />
          <MText variant="bodySemibold" size={14} color={MPAL.ink}>
            {busy === 'save' ? '…' : lang === 'fr' ? 'Enregistrer' : 'Save'}
          </MText>
        </Pressable>
      </View>
    </View>
  );
}

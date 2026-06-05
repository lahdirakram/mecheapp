import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDeleteLook, useGeneration, useSaveLook, useSession, useToggleLove } from '@meche/api-client';
import { MIcon, MPAL, MText, MPortrait, TopBar, useLang, useT, useToast, useSheet } from '@meche/ui';
import { useTryStore } from '../../lib/tryStore';

// B2C · Avant / après (10) — draggable comparison. Left reveals the generated "after", right
// shows the "before"; white divider + round handle. Ported from MScreenResult.
// Two modes: fresh (from a just-finished generation via the store) or review (re-opened from
// "Mes mèches" via params — the selfie/result are reloaded from the saved generation).
export default function Result() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const { selfieBase64, mimeType, result } = useTryStore();
  const params = useLocalSearchParams<{ generationId?: string; lookId?: string; name?: string; after?: string; loved?: string }>();
  const session = useSession();
  const toast = useToast();
  const sheet = useSheet();
  const { mutate: saveLook } = useSaveLook();
  const { mutate: toggleLove } = useToggleLove();
  const { mutate: deleteLook } = useDeleteLook();
  // Review mode: no fresh result in the store but we were handed a generation to re-open.
  const review = !result && !!params.generationId;
  const { data: gen } = useGeneration(review ? params.generationId : undefined);
  const [pos, setPos] = useState(0.55);
  const [saved, setSaved] = useState(params.loved === '1');
  const [w, setW] = useState(0);

  useEffect(() => {
    if (params.loved === '1') setSaved(true);
  }, [params.loved]);

  const beforeUri = selfieBase64 ? `data:${mimeType};base64,${selfieBase64}` : gen?.selfieUrl ?? null;
  // `after` is a private storage path now → use the signed URL from the generation; only fall
  // back to the param if it's already a full URL.
  const afterUri = result?.uri ?? gen?.resultUrl ?? (params.after && /^https?:\/\//.test(params.after) ? params.after : null);
  const title = result?.name ?? params.name ?? (lang === 'fr' ? 'Ma mèche' : 'My look');
  const matchPct = result?.match ?? gen?.match ?? null;
  const savedLookId = result?.savedLookId ?? params.lookId;

  // The generation is already auto-saved to "Mes essais"; the heart toggles "préféré" on it.
  const onSave = () => {
    if (!session) {
      toast(lang === 'fr' ? 'Connecte-toi pour garder ta mèche.' : 'Sign in to keep your look.');
      return;
    }
    const next = !saved;
    if (savedLookId) {
      toggleLove({ id: savedLookId, loved: next });
      setSaved(next);
      toast(next ? (lang === 'fr' ? 'Ajouté à tes préférés.' : 'Added to favorites.') : lang === 'fr' ? 'Retiré des préférés.' : 'Removed from favorites.');
    } else if (next) {
      // no auto-saved row (e.g. placeholder result) → save it now
      saveLook({ userId: session.user.id, name: title, imageUrl: result?.uri, generationId: result?.generationId, loved: true });
      setSaved(true);
      toast(lang === 'fr' ? 'Gardé dans Mes mèches.' : 'Kept in My looks.');
    }
  };

  const generationId = result?.generationId ?? params.generationId;
  const onDelete = () => {
    if (!savedLookId && !generationId) return;
    sheet({
      title: lang === 'fr' ? 'Supprimer cette mèche ?' : 'Delete this look?',
      message: lang === 'fr' ? 'L’essai et sa photo seront définitivement supprimés.' : 'The try-on and its photo will be permanently deleted.',
      options: [
        {
          label: lang === 'fr' ? 'Supprimer' : 'Delete',
          destructive: true,
          onPress: () =>
            deleteLook(
              { lookId: savedLookId, generationId },
              {
                onSuccess: () => {
                  toast(lang === 'fr' ? 'Mèche supprimée.' : 'Look deleted.');
                  router.dismissAll();
                },
                onError: () => toast(lang === 'fr' ? 'Suppression impossible.' : 'Could not delete.'),
              },
            ),
        },
        { label: lang === 'fr' ? 'Annuler' : 'Cancel', cancel: true },
      ],
    });
  };
  const wRef = useRef(0);
  wRef.current = w;
  const originX = useRef(0); // container's absolute window X (measured, not inferred from touch)
  const containerRef = useRef<View>(null);
  // Measure the comparison box's true position on screen. Inferring it from locationX was wrong
  // (locationX is relative to the touched sub-view), which made the handle snap on first touch.
  const measure = () => containerRef.current?.measureInWindow((x, _y, width) => {
    originX.current = x;
    if (width) {
      wRef.current = width;
      setW(width);
    }
  });

  const responder = useMemo(
    () => {
      // Drive from absolute screen X (gestureState x0/moveX) minus the measured container origin.
      const setFrom = (absX: number) => {
        if (wRef.current > 0) setPos(Math.max(0, Math.min(1, (absX - originX.current) / wRef.current)));
      };
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (_e, g) => setFrom(g.x0),
        onPanResponderMove: (_e, g) => setFrom(g.moveX),
      });
    },
    [],
  );

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top }}>
      <TopBar
        onBack={() => router.dismissAll()}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={onSave} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: saved ? MPAL.ink : 'rgba(0,0,0,0.05)' }}>
              <MIcon name="heart" size={18} color={saved ? '#fff' : MPAL.ink} fill={saved ? '#fff' : 'none'} />
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/share', params: { name: title, generationId: generationId ?? '', after: afterUri ?? '' } })}
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}
            >
              <MIcon name="share" size={18} color={MPAL.ink} />
            </Pressable>
            {savedLookId || generationId ? (
              <Pressable onPress={onDelete} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
                <MIcon name="trash" size={18} color={MPAL.ink} />
              </Pressable>
            ) : null}
          </View>
        }
      />

      <View style={{ paddingHorizontal: 18 }}>
        <MText variant="mono" size={10} color={MPAL.ink} style={{ letterSpacing: 1.4 }}>
          {review ? '✦ TON ESSAI' : '✦ TON APERÇU'}
        </MText>
        <MText variant="serif" size={30} style={{ marginTop: 4, lineHeight: 32 }} numberOfLines={1}>
          {title}
        </MText>
        <MText size={13} color={MPAL.mute} style={{ marginTop: 4 }}>
          {lang === 'fr' ? 'Tu peux glisser pour comparer' : 'Drag to compare'}
        </MText>
      </View>

      {/* comparison */}
      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 14 }}>
        <View
          ref={containerRef}
          {...responder.panHandlers}
          onLayout={measure}
          style={{ flex: 1, borderRadius: 24, overflow: 'hidden' }}
        >
          {/* before (full) — real selfie if available */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            {beforeUri ? (
              <Image source={{ uri: beforeUri }} style={{ flex: 1 }} contentFit="cover" />
            ) : (
              <MPortrait hair="medium" mood="warm" label="AVANT" />
            )}
          </View>
          {/* after (clipped to pos) — real generated result if present */}
          <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: w * pos, overflow: 'hidden' }}>
            <View style={{ width: w, height: '100%' }}>
              {afterUri ? (
                <Image source={{ uri: afterUri }} style={{ width: w, height: '100%' }} contentFit="cover" />
              ) : (
                <MPortrait hair="bob" mood="warm" tint={MPAL.ink} label="APRÈS" />
              )}
            </View>
          </View>

          {/* badges */}
          <View style={{ position: 'absolute', top: 14, left: 14, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.95)' }}>
            <MText variant="bodyBold" size={10} color={MPAL.ink} style={{ letterSpacing: 1 }}>
              {t('after').toUpperCase()}
              {matchPct != null ? ` · ${matchPct}%` : ''}
            </MText>
          </View>
          <View style={{ position: 'absolute', top: 14, right: 14, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <MText variant="bodyBold" size={10} color="#fff" style={{ letterSpacing: 1 }}>
              {t('before').toUpperCase()}
            </MText>
          </View>

          {/* divider + handle — handle sits near the bottom so it never covers the face */}
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: w * pos - 1, width: 2, backgroundColor: '#fff' }} />
          <View style={{ position: 'absolute', bottom: 20, left: w * pos - 24, width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } }}>
            <MIcon name="chevronLeft" size={14} color={MPAL.ink} />
            <MIcon name="chevronRight" size={14} color={MPAL.ink} />
          </View>
        </View>
      </View>

      {/* actions */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 14, paddingBottom: insets.bottom + 16 }}>
        <Pressable onPress={() => router.back()} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: MPAL.border }}>
          <MIcon name="sparkle" size={15} color={MPAL.ink} />
          <MText variant="bodySemibold" size={14} color={MPAL.ink}>
            {t('see_more')}
          </MText>
        </Pressable>
        <Pressable onPress={() => { router.dismissAll(); router.navigate('/(tabs)/salons'); }} style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 999, backgroundColor: MPAL.ink }}>
          <MIcon name="pin" size={15} color="#fff" />
          <MText variant="bodySemibold" size={14} color="#fff">
            {t('book')}
          </MText>
        </Pressable>
      </View>
    </View>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, PanResponder, Platform, Pressable, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCredits, useDeleteLook, useGeneration, useSaveLook, useSession, useToggleLove } from '@meche/api-client';
import { FONTS, MIcon, MPAL, MText, MPortrait, TopBar, useLang, useT, useToast } from '@meche/ui';
import { useTryStore } from '../../lib/tryStore';
import { cacheKeyFor } from '../../lib/img';

// B2C · Avant / après (10) — draggable comparison. Left reveals the generated "after", right
// shows the "before"; white divider + round handle. Ported from MScreenResult.
// Deterministic: ONE input, the `generationId` param. The before/after are that generation's signed
// URLs — every entry point (generation done, refine done, re-open from "Mes mèches") arrives with it.
// No transient store selfie/result is read here, so nothing can leak in from another flow or account.
export default function Result() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  // The store is NOT a source of truth for what this screen shows — `setResult` only seeds the loader
  // backdrop on a refine. Everything displayed comes from the generation identified by the params.
  const { setBrief, setRefine, setResult } = useTryStore();
  const params = useLocalSearchParams<{ generationId?: string; lookId?: string; name?: string; after?: string; loved?: string; fresh?: string }>();
  const session = useSession();
  const { data: credits } = useCredits(session?.user.id);
  const toast = useToast();
  const { mutate: saveLook } = useSaveLook();
  const { mutate: toggleLove } = useToggleLove();
  const { mutate: deleteLook } = useDeleteLook();
  const [refineText, setRefineText] = useState('');
  // SINGLE source of truth: the generation id from the params. The before/after are its signed URLs —
  // never a transient store selfie that could linger from another flow/account. Every entry point
  // (generation done, refine done, re-open from "Mes mèches") arrives here with this id.
  const generationId = params.generationId;
  const { data: gen } = useGeneration(generationId);
  const [pos, setPos] = useState(0.55);
  const [saved, setSaved] = useState(params.loved === '1');
  const [w, setW] = useState(0);
  // Manual keyboard avoidance: this screen is a fullScreenModal whose window doesn't resize on
  // Android (KeyboardAvoidingView did nothing there), so we lift the content by the measured keyboard
  // height ourselves — the flex:1 comparison shrinks and the refine bar rises above the keyboard.
  const [kb, setKb] = useState(0);

  useEffect(() => {
    if (params.loved === '1') setSaved(true);
  }, [params.loved]);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKb(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // before/after are the generation's private files (signed on read). The `after` param is only a
  // fallback for when it's already a full URL (e.g. a share deep-link).
  const beforeUri = gen?.selfieUrl ?? null;
  const afterUri = gen?.resultUrl ?? (params.after && /^https?:\/\//.test(params.after) ? params.after : null);
  const title = params.name ?? (lang === 'fr' ? 'Ma mèche' : 'My look');
  const savedLookId = params.lookId;

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
      saveLook({ userId: session.user.id, name: title, imageUrl: afterUri ?? undefined, generationId, loved: true });
      setSaved(true);
      toast(lang === 'fr' ? 'Gardé dans Mes mèches.' : 'Kept in My looks.');
    }
  };

  const onDelete = () => {
    if (!savedLookId && !generationId) return;
    // Native Alert (not the custom sheet): this screen is a fullScreenModal, and a root-rendered
    // sheet appears BEHIND it on iOS. Alert always presents above the topmost modal.
    Alert.alert(
      lang === 'fr' ? 'Supprimer cette mèche ?' : 'Delete this look?',
      lang === 'fr' ? 'L’essai et sa photo seront définitivement supprimés.' : 'The try-on and its photo will be permanently deleted.',
      [
        { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'fr' ? 'Supprimer' : 'Delete',
          style: 'destructive',
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
      ],
    );
  };
  // Refine: re-generate from the ORIGINAL selfie + this result + the user's tweak. Each pass is a
  // fresh generation (1 credit), so the user can keep refining until credits run out.
  const onRefine = () => {
    const text = refineText.trim();
    if (!text || !generationId) return;
    if (!session) {
      toast(lang === 'fr' ? 'Connecte-toi pour affiner.' : 'Sign in to refine.');
      return;
    }
    setBrief({ prompt: text, lookName: title });
    setRefine(generationId);
    // Seed the loader backdrop with the look being refined (the generating screen has no local selfie
    // on a refine). This is the ONLY thing the store result feeds now — purely cosmetic.
    if (afterUri) setResult({ uri: afterUri, match: gen?.match ?? 0, generationId, name: title, savedLookId });
    // Keep `refineText` as-is — if the pass fails and we land back here, the user can retry without
    // retyping. A successful refine navigates to a fresh result screen, so it won't linger.
    router.push('/try/generating');
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
        // Greedy: claim every touch and follow it in any direction. The modal's swipe-to-dismiss
        // is disabled (see _layout.tsx) so there's nothing to compete with — diagonal/hybrid drags
        // keep driving the slider instead of stalling.
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Touching the photo also dismisses the refine keyboard (otherwise there's no way to close
        // it on this screen, since the comparison swallows taps for the slider).
        onPanResponderGrant: (_e, g) => {
          Keyboard.dismiss();
          setFrom(g.x0);
        },
        onPanResponderMove: (_e, g) => setFrom(g.moveX),
      });
    },
    [],
  );

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top, paddingBottom: kb }}>
      <TopBar
        onBack={() => router.dismissAll()}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable hitSlop={6} onPress={onSave} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: saved ? MPAL.ink : 'rgba(0,0,0,0.05)' }}>
              <MIcon name="heart" size={18} color={saved ? '#fff' : MPAL.ink} fill={saved ? '#fff' : 'none'} />
            </Pressable>
            <Pressable
              hitSlop={6}
              onPress={() => router.push({ pathname: '/share', params: { name: title, generationId: generationId ?? '', after: afterUri ?? '' } })}
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}
            >
              <MIcon name="share" size={18} color={MPAL.ink} />
            </Pressable>
            {savedLookId || generationId ? (
              <Pressable hitSlop={6} onPress={onDelete} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
                <MIcon name="trash" size={18} color={MPAL.ink} />
              </Pressable>
            ) : null}
          </View>
        }
      />

      <View style={{ paddingHorizontal: 18 }}>
        <MText variant="mono" size={10} color={MPAL.ink} style={{ letterSpacing: 1.4 }}>
          {`✦ ${(params.fresh === '1' ? t('your_preview') : t('your_try')).toUpperCase()}`}
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
              <Image source={{ uri: beforeUri, cacheKey: cacheKeyFor(beforeUri) }} style={{ flex: 1 }} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <MPortrait hair="medium" mood="warm" label={t('before').toUpperCase()} />
            )}
          </View>
          {/* after (clipped to pos) — real generated result if present */}
          <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: w * pos, overflow: 'hidden' }}>
            <View style={{ width: w, height: '100%' }}>
              {afterUri ? (
                <Image source={{ uri: afterUri, cacheKey: cacheKeyFor(afterUri) }} style={{ width: w, height: '100%' }} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <MPortrait hair="bob" mood="warm" tint={MPAL.ink} label={t('after').toUpperCase()} />
              )}
            </View>
          </View>

          {/* badges */}
          <View style={{ position: 'absolute', top: 14, left: 14, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.95)' }}>
            <MText variant="bodyBold" size={10} color={MPAL.ink} style={{ letterSpacing: 1 }}>
              {t('after').toUpperCase()}
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

      {/* refine — tweak this look in one line, re-running on the original photo + this result */}
      {generationId && afterUri ? (
        <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border, borderRadius: 999, paddingLeft: 16, paddingRight: 6, paddingVertical: 6 }}>
            <MIcon name="sparkle" size={16} color={MPAL.sable} />
            <TextInput
              value={refineText}
              onChangeText={setRefineText}
              placeholder={t('refine_placeholder')}
              placeholderTextColor={MPAL.mute}
              maxLength={120}
              returnKeyType="send"
              onSubmitEditing={onRefine}
              style={{ flex: 1, fontFamily: FONTS.serif, fontSize: 14, color: MPAL.ink, paddingVertical: 6 }}
            />
            <Pressable onPress={onRefine} disabled={!refineText.trim()} style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: refineText.trim() ? MPAL.ink : MPAL.subtle }}>
              <MText variant="bodySemibold" size={13} color={refineText.trim() ? '#fff' : MPAL.mute}>
                {t('refine_cta')}
              </MText>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
            <MIcon name="coin" size={11} color={MPAL.mute} />
            <MText size={11} color={MPAL.mute}>
              {lang === 'fr' ? `Affiner utilise 1 crédit · ${credits ?? 0} restants` : `Refining uses 1 credit · ${credits ?? 0} left`}
            </MText>
          </View>
        </View>
      ) : null}

      {/* actions */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 14, paddingBottom: insets.bottom + 16 }}>
        <Pressable onPress={() => router.back()} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: MPAL.border }}>
          <MIcon name="sparkle" size={15} color={MPAL.ink} />
          <MText variant="bodySemibold" size={14} color={MPAL.ink}>
            {t('see_more')}
          </MText>
        </Pressable>
        {/* Réserver — inert + greyed with a "Bientôt" badge until booking ships, matching the
            coming-soon salons tab in the main menu. */}
        <View style={{ flex: 1.4 }}>
          <View style={{ position: 'absolute', top: -8, left: 0, right: 0, alignItems: 'center', zIndex: 1 }}>
            <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: MPAL.sable }}>
              <MText variant="mono" size={7} color="#fff" style={{ letterSpacing: 0.4 }}>
                {(lang === 'fr' ? 'Bientôt' : 'Soon').toUpperCase()}
              </MText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 999, backgroundColor: MPAL.subtle, opacity: 0.7 }}>
            <MIcon name="pin" size={15} color={MPAL.mute} />
            <MText variant="bodySemibold" size={14} color={MPAL.mute}>
              {t('book')}
            </MText>
          </View>
        </View>
      </View>
    </View>
  );
}

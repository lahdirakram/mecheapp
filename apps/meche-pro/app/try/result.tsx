import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, PanResponder, Platform, Pressable, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDeleteLook, useGeneration } from '@meche/api-client';
import { FONTS, MIcon, MPAL, MText, MPortrait, TopBar, useLang, useToast } from '@meche/ui';
import { useTryStore } from '../../lib/tryStore';
import { useExitTry } from '../../lib/useExitTry';
import { cacheKeyFor } from '../../lib/img';
import { localFirstUri, useLocalImage } from '../../lib/localImages';

// Pro · Avant / après — draggable comparison ported from B2C, reworked for the chair: the client
// compares, the stylist can refine or delete the photos on the spot, then move on to the next
// client. AI renders are NEVER published as réalisations — the portfolio only takes real photos
// (added from the Réalisations screen after the actual cut).
export default function Result() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lang = useLang();
  const { setBrief, setRefine, setResult } = useTryStore();
  const exitTry = useExitTry();
  const params = useLocalSearchParams<{ generationId?: string; lookId?: string; name?: string; clientName?: string; fresh?: string }>();
  const toast = useToast();
  const { mutate: deleteLook } = useDeleteLook();
  const [refineText, setRefineText] = useState('');
  // SINGLE source of truth: the generation id from the params (same contract as B2C).
  const generationId = params.generationId;
  const { data: gen } = useGeneration(generationId);
  const [pos, setPos] = useState(0.55);
  const [w, setW] = useState(0);
  // Manual keyboard avoidance (fullScreenModal window doesn't resize on Android).
  const [kb, setKb] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKb(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // before/after prefer the durable local copy (zero egress); signed URL is the fallback.
  const beforeLocal = useLocalImage('selfies', gen?.selfiePath);
  const afterLocal = useLocalImage('generated', gen?.resultPath);
  const beforeUri = localFirstUri(beforeLocal, gen?.selfieUrl ?? null);
  const afterUri = localFirstUri(afterLocal, gen?.resultUrl ?? null);
  const title = params.name ?? (lang === 'fr' ? 'Essai cliente' : 'Client try-on');

  // Delete the try-on entirely (client photo privacy): storage files + generation row.
  const onDelete = () => {
    if (!generationId) return;
    Alert.alert(
      lang === 'fr' ? 'Supprimer cet essai ?' : 'Delete this try-on?',
      lang === 'fr' ? 'La photo de ta cliente et le résultat seront définitivement supprimés.' : 'Your client’s photo and the result will be permanently deleted.',
      [
        { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'fr' ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteLook(
              { lookId: params.lookId || undefined, generationId },
              {
                onSuccess: () => {
                  toast(lang === 'fr' ? 'Essai supprimé.' : 'Try-on deleted.');
                  exitTry();
                },
                onError: () => toast(lang === 'fr' ? 'Suppression impossible.' : 'Could not delete.'),
              },
            ),
        },
      ],
    );
  };

  // Refine: re-generate from the ORIGINAL photo + this result + the tweak. Same replace-not-push
  // stack discipline as B2C so the pile stays [selfie, idea, result].
  const onRefine = () => {
    const text = refineText.trim();
    if (!text || !generationId) return;
    // Carry the client name so the refined pass stays in her history.
    setBrief({ prompt: text, lookName: title, clientName: params.clientName || undefined });
    setRefine(generationId);
    if (afterUri) setResult({ uri: afterUri, match: gen?.match ?? 0, generationId, name: title });
    router.replace('/try/generating');
  };

  // Next client: leave the flow, reset, and reopen at the selfie.
  const nextClient = () => {
    exitTry();
    setTimeout(() => {
      useTryStore.getState().reset();
      router.push('/try');
    }, 0);
  };

  const wRef = useRef(0);
  wRef.current = w;
  const originX = useRef(0);
  const containerRef = useRef<View>(null);
  const measure = () =>
    containerRef.current?.measureInWindow((x, _y, width) => {
      originX.current = x;
      if (width) {
        wRef.current = width;
        setW(width);
      }
    });

  const responder = useMemo(() => {
    const setFrom = (absX: number) => {
      if (wRef.current > 0) setPos(Math.max(0, Math.min(1, (absX - originX.current) / wRef.current)));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_e, g) => {
        Keyboard.dismiss();
        setFrom(g.x0);
      },
      onPanResponderMove: (_e, g) => setFrom(g.moveX),
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top, paddingBottom: kb }}>
      <TopBar
        onBack={() => exitTry()}
        right={
          generationId ? (
            <Pressable hitSlop={6} onPress={onDelete} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
              <MIcon name="trash" size={18} color={MPAL.ink} />
            </Pressable>
          ) : undefined
        }
      />

      <View style={{ paddingHorizontal: 18 }}>
        <MText variant="mono" size={10} color={MPAL.ink} style={{ letterSpacing: 1.4 }}>
          {`✦ ${(params.clientName ? (lang === 'fr' ? `L'aperçu de ${params.clientName}` : `${params.clientName}'s preview`) : lang === 'fr' ? 'Son aperçu' : 'Her preview').toUpperCase()}`}
        </MText>
        <MText variant="serif" size={30} style={{ marginTop: 4, lineHeight: 32 }} numberOfLines={1}>
          {title}
        </MText>
        <MText size={13} color={MPAL.mute} style={{ marginTop: 4 }}>
          {lang === 'fr' ? 'Fais glisser pour comparer avec elle' : 'Drag to compare together'}
        </MText>
      </View>

      {/* comparison */}
      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 14 }}>
        <View ref={containerRef} {...responder.panHandlers} onLayout={measure} style={{ flex: 1, borderRadius: 24, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            {beforeUri ? (
              <Image source={{ uri: beforeUri, cacheKey: cacheKeyFor(beforeUri) }} style={{ flex: 1 }} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <MPortrait hair="medium" mood="warm" label={(lang === 'fr' ? 'Avant' : 'Before').toUpperCase()} />
            )}
          </View>
          <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: w * pos, overflow: 'hidden' }}>
            <View style={{ width: w, height: '100%' }}>
              {afterUri ? (
                <Image source={{ uri: afterUri, cacheKey: cacheKeyFor(afterUri) }} style={{ width: w, height: '100%' }} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <MPortrait hair="bob" mood="warm" tint={MPAL.ink} label={(lang === 'fr' ? 'Après' : 'After').toUpperCase()} />
              )}
            </View>
          </View>

          {/* badges */}
          <View style={{ position: 'absolute', top: 14, left: 14, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.95)' }}>
            <MText variant="bodyBold" size={10} color={MPAL.ink} style={{ letterSpacing: 1 }}>
              {(lang === 'fr' ? 'Après' : 'After').toUpperCase()}
            </MText>
          </View>
          <View style={{ position: 'absolute', top: 14, right: 14, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <MText variant="bodyBold" size={10} color="#fff" style={{ letterSpacing: 1 }}>
              {(lang === 'fr' ? 'Avant' : 'Before').toUpperCase()}
            </MText>
          </View>

          {/* divider + handle */}
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: w * pos - 1, width: 2, backgroundColor: '#fff' }} />
          <View style={{ position: 'absolute', bottom: 20, left: w * pos - 24, width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } }}>
            <MIcon name="chevronLeft" size={14} color={MPAL.ink} />
            <MIcon name="chevronRight" size={14} color={MPAL.ink} />
          </View>
        </View>
      </View>

      {/* refine */}
      {generationId && afterUri ? (
        <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border, borderRadius: 999, paddingLeft: 16, paddingRight: 6, paddingVertical: 6 }}>
            <MIcon name="sparkle" size={16} color={MPAL.sable} />
            <TextInput
              value={refineText}
              onChangeText={setRefineText}
              placeholder={lang === 'fr' ? 'Un peu plus court, plus doré…' : 'A bit shorter, more golden…'}
              placeholderTextColor={MPAL.mute}
              maxLength={120}
              returnKeyType="send"
              onSubmitEditing={onRefine}
              style={{ flex: 1, fontFamily: FONTS.serif, fontSize: 14, color: MPAL.ink, paddingVertical: 6 }}
            />
            <Pressable onPress={onRefine} disabled={!refineText.trim()} style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: refineText.trim() ? MPAL.ink : MPAL.subtle }}>
              <MText variant="bodySemibold" size={13} color={refineText.trim() ? '#fff' : MPAL.mute}>
                {lang === 'fr' ? 'Affiner' : 'Refine'}
              </MText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* actions */}
      <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: insets.bottom + 16 }}>
        <Pressable onPress={nextClient} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 999, backgroundColor: MPAL.sable }}>
          <MIcon name="cam" size={15} color="#fff" />
          <MText variant="bodySemibold" size={15} color="#fff">
            {lang === 'fr' ? 'Nouvelle cliente' : 'New client'}
          </MText>
        </Pressable>
      </View>
    </View>
  );
}

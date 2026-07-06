import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useQueryClient } from '@tanstack/react-query';
import { MPAL, MText, MPortrait, useLang, useToast } from '@meche/ui';
import { supabase } from '../../lib/supabase';
import { useTryStore } from '../../lib/tryStore';
import { useExitTry } from '../../lib/useExitTry';

// Pro · Génération — dark loader that WATCHES a background generation, ported from B2C. /generate
// enqueues the try-on server-side (with the PRO quota checks) and returns immediately; this screen
// polls the generation row until it's done. Pro-specific errors: pro_subscription_required routes
// to the paywall, pro_quota_exceeded explains the monthly cap.
const ACCENT = MPAL.sable;
const SCREEN_H = Dimensions.get('window').height;
const STEPS_FR = ['ANALYSE DU VISAGE', 'LECTURE DE L’IDÉE', 'COMPOSITION', 'FINALISATION'];
const STEPS_EN = ['FACE ANALYSIS', 'READING THE IDEA', 'COMPOSITION', 'FINALISING'];

export default function Generating() {
  const router = useRouter();
  const exitTry = useExitTry();
  const lang = useLang();
  const toast = useToast();
  const qc = useQueryClient();
  const { selfieBase64, mimeType, brief, refineFrom, result, setRefine } = useTryStore();
  const [pct, setPct] = useState(0);
  const doneRef = useRef(false);
  const failedRef = useRef(false);
  const completedRef = useRef<{ id: string; lookId?: string; name: string } | null>(null);
  // Snapshot the refine target once and clear it, so a later normal generation can't reuse it.
  const refineRef = useRef<string | null>(refineFrom);
  // Loader backdrop only (cosmetic): on a refine, the look being refined; otherwise the selfie.
  const bgUri = refineRef.current ? result?.uri ?? null : selfieBase64 ? `data:${mimeType};base64,${selfieBase64}` : null;
  const scanY = useRef(new Animated.Value(0)).current;

  // Paywall is a modal at the ROOT, while this loader sits deep inside the `try` fullScreenModal:
  // leave the flow first, then push the paywall (deferred a tick so the navigation settles).
  const goPaywall = () => {
    exitTry();
    setTimeout(() => router.push('/paywall'), 0);
  };

  // Where to send the user when a generation FAILS. A refine returns to its source result so they
  // can retry without retyping; a first generation pops back to the idea screen.
  const failBack = () => {
    const src = refineRef.current;
    if (src) {
      router.replace({ pathname: '/try/result', params: { generationId: src, name: result?.name ?? '' } });
    } else {
      router.back();
    }
  };

  // Continuous scan-line sweep — runs regardless of progress so the loader never looks frozen.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanY, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanY]);

  useEffect(() => {
    let cancelled = false;
    const iv = setInterval(() => {
      setPct((p) => {
        if (doneRef.current) return Math.min(100, p + 7);
        if (p >= 95) return 95;
        return Math.min(95, p + Math.max(0.4, (95 - p) * 0.02));
      });
    }, 130);

    const refine = refineRef.current;
    setRefine(null); // consumed — don't let it leak into a later generation

    (async () => {
      if (!selfieBase64 && !refine) {
        // No photo (permission denied etc.) → nothing to send; bail out cleanly.
        failedRef.current = true;
        toast(lang === 'fr' ? 'Photo manquante, reprends-la.' : 'Missing photo, retake it.');
        router.back();
        return;
      }
      const name = brief.lookName || (brief.prompt ? brief.prompt.slice(0, 40) : lang === 'fr' ? 'Essai cliente' : 'Client try-on');
      const clientName = brief.clientName;
      try {
        const body = refine ? { refineFrom: refine, brief, name, clientName } : { selfieBase64, mimeType, brief, name, clientName };
        const { data, error } = await supabase.functions.invoke('generate', { body });
        if (cancelled) return;
        if (error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e = error as any;
          const ctx = e?.context ?? e?.response;
          let status: number | undefined = typeof ctx?.status === 'number' ? ctx.status : undefined;
          let code: string | undefined;
          try {
            const errBody = ctx && typeof ctx.json === 'function' ? await ctx.json() : undefined;
            code = errBody?.error;
            if (status == null && typeof errBody?.status === 'number') status = errBody.status;
          } catch {
            /* body may be unreadable */
          }
          failedRef.current = true;
          if (code === 'pro_subscription_required') {
            toast(lang === 'fr' ? 'Tes 3 essais offerts sont utilisés. Passe à Mèche Pro pour continuer.' : 'Your 3 free try-ons are used. Go Mèche Pro to continue.');
            goPaywall();
            return;
          }
          if (code === 'pro_quota_exceeded') {
            toast(lang === 'fr' ? 'Quota du mois atteint (100 essais). Il se recharge le 1er.' : 'Monthly quota reached (100 try-ons). It resets on the 1st.');
            failBack();
            return;
          }
          console.warn('[generate] unhandled error', { status, code });
          toast(lang === 'fr' ? 'Génération impossible, réessaie.' : 'Generation failed, try again.');
          failBack();
          return;
        }
        // Enqueued (status: 'pending') — refresh the quota counter AND the Studio history right
        // away, so the new essai shows up (as "en cours") the moment the user leaves the flow.
        qc.invalidateQueries({ queryKey: ['prostatus'] });
        qc.invalidateQueries({ queryKey: ['looks'] });
        const genId = data.id as string;
        const lookId = data.lookId as string | undefined;

        // Watch the generation row while we stay on the loader.
        const startedAt = Date.now();
        while (!cancelled) {
          await new Promise((r) => setTimeout(r, 1500));
          if (cancelled) return;
          const { data: g } = await supabase.from('generations').select('status').eq('id', genId).single();
          if (cancelled) return;
          if (g?.status === 'done') {
            // The look now has its image — refresh the Studio history so it renders the thumbnail
            // (not the "en cours" spinner) when the user comes back.
            qc.invalidateQueries({ queryKey: ['looks'] });
            completedRef.current = { id: genId, lookId, name };
            doneRef.current = true;
            return;
          }
          if (g?.status === 'failed') {
            failedRef.current = true;
            toast(lang === 'fr' ? 'Génération impossible, ton quota n’a pas bougé.' : 'Generation failed, your quota was kept.');
            failBack();
            return;
          }
          if (Date.now() - startedAt > 60000) {
            failedRef.current = true;
            toast(lang === 'fr' ? 'Ça prend plus de temps que prévu. Réessaie dans un instant.' : 'Taking longer than expected. Try again in a moment.');
            failBack();
            return;
          }
        }
      } catch {
        if (cancelled) return;
        failedRef.current = true;
        toast(lang === 'fr' ? 'Génération impossible, réessaie.' : 'Generation failed, try again.');
        failBack();
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pct >= 100 && doneRef.current && !failedRef.current) {
      const to = setTimeout(() => {
        const c = completedRef.current;
        if (c) router.replace({ pathname: '/try/result', params: { generationId: c.id, lookId: c.lookId ?? '', name: c.name, clientName: useTryStore.getState().brief.clientName ?? '', fresh: '1' } });
      }, 300);
      return () => clearTimeout(to);
    }
  }, [pct, router]);

  const steps = lang === 'fr' ? STEPS_FR : STEPS_EN;
  const step = steps[Math.min(3, Math.floor(pct / 25))];

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0908' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.85 }}>
        {bgUri ? (
          <Image source={{ uri: bgUri }} style={{ flex: 1 }} contentFit="cover" />
        ) : (
          <MPortrait hair="medium" mood="warm" tint={ACCENT} />
        )}
      </View>
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      {/* scan line */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 2,
          backgroundColor: ACCENT,
          shadowColor: ACCENT,
          shadowOpacity: 0.9,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 0 },
          transform: [{ translateY: scanY.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_H * 0.14, SCREEN_H * 0.82] }) }],
        }}
      />

      {/* corner brackets */}
      <Svg width="100%" height="100%" viewBox="0 0 402 874" preserveAspectRatio="none" style={{ position: 'absolute' }} pointerEvents="none">
        <Path d="M40 154 L40 140 L54 140" stroke={ACCENT} strokeWidth={2} fill="none" />
        <Path d="M362 154 L362 140 L348 140" stroke={ACCENT} strokeWidth={2} fill="none" />
        <Path d="M40 546 L40 560 L54 560" stroke={ACCENT} strokeWidth={2} fill="none" />
        <Path d="M362 546 L362 560 L348 560" stroke={ACCENT} strokeWidth={2} fill="none" />
      </Svg>

      <View style={{ position: 'absolute', top: 120, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 30 }}>
        <MText variant="mono" size={10} color="rgba(255,255,255,0.65)" style={{ letterSpacing: 1.4, marginBottom: 8 }}>
          ÉTAPE 3 / 3
        </MText>
        <MText variant="serif" size={34} color="#fff" style={{ textAlign: 'center', lineHeight: 36 }}>
          {lang === 'fr' ? 'Mèche compose sa coupe…' : 'Mèche is composing her cut…'}
        </MText>
      </View>

      <View style={{ position: 'absolute', bottom: 80, left: 24, right: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <MText variant="mono" size={11} color="rgba(255,255,255,0.7)" style={{ letterSpacing: 1.2 }}>
            {step}
          </MText>
          <MText variant="mono" size={11} color="rgba(255,255,255,0.7)" style={{ letterSpacing: 1.2 }}>
            {Math.round(pct)}%
          </MText>
        </View>
        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${pct}%`, backgroundColor: ACCENT }} />
        </View>
        <MText size={12} color="rgba(255,255,255,0.6)" style={{ textAlign: 'center', marginTop: 14 }}>
          {lang === 'fr' ? '~ 20 secondes' : '~ 20 seconds'}
        </MText>
      </View>
    </View>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useQueryClient } from '@tanstack/react-query';
import { MPAL, MText, MPortrait, useLang, useT, useToast } from '@meche/ui';
import { supabase } from '../../lib/supabase';
import { useTryStore } from '../../lib/tryStore';

// B2C · Génération (09) — dark loader that WATCHES a background generation. /generate enqueues the
// try-on server-side and returns immediately; this screen polls the generation row until it's done.
// Leaving is safe: the work keeps running and the look appears in "Mes mèches" on its own. Gemini
// latency is unknown (~15-20s), so progress never hard-freezes: it trickles toward ~95% and the
// scan line sweeps on its own loop. On completion it races to 100% and reveals the before/after.
const ACCENT = MPAL.sable;
const SCREEN_H = Dimensions.get('window').height;
const STEPS_FR = ['ANALYSE DU VISAGE', 'LECTURE DE L’IDÉE', 'COMPOSITION', 'FINALISATION'];
const STEPS_EN = ['FACE ANALYSIS', 'READING THE IDEA', 'COMPOSITION', 'FINALISING'];

export default function Generating() {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const qc = useQueryClient();
  const { selfieBase64, mimeType, brief, refineFrom, result, setRefine } = useTryStore();
  const [pct, setPct] = useState(0);
  const doneRef = useRef(false);
  const failedRef = useRef(false);
  // The finished generation, for the navigation effect below.
  const completedRef = useRef<{ id: string; lookId?: string; name: string } | null>(null);
  // Snapshot the refine target once and clear it, so a later normal generation can't reuse it.
  const refineRef = useRef<string | null>(refineFrom);
  // Loader backdrop only (cosmetic): on a refine, the look being refined (seeded into the store by the
  // result screen); otherwise the just-captured selfie; else the placeholder.
  const bgUri = refineRef.current ? result?.uri ?? null : selfieBase64 ? `data:${mimeType};base64,${selfieBase64}` : null;
  const scanY = useRef(new Animated.Value(0)).current;

  // Recharge is a modal at the ROOT, a sibling of the `try` fullScreenModal — while this loader sits
  // deep inside the `try` nested stack. So back()/replace() here only move WITHIN `try` and strand the
  // user on the prompt screen. Dismiss the whole `try` modal first, then surface recharge over the
  // tabs (deferred a tick so the dismiss settles before the push).
  const goRecharge = (low?: boolean) => {
    router.dismissAll();
    setTimeout(() => router.push(low ? '/recharge?low=1' : '/recharge'), 0);
  };

  // Continuous scan-line sweep — runs regardless of progress so the loader never looks frozen,
  // even while Gemini takes its time.
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
        if (doneRef.current) return Math.min(100, p + 7); // result is in → race to 100
        // Ease-out trickle toward a soft 95% ceiling: fast at first, ever-slower near the top, with
        // a small floor so it always keeps moving. The sweeping scan line carries the "alive" feel.
        if (p >= 95) return 95;
        return Math.min(95, p + Math.max(0.4, (95 - p) * 0.02));
      });
    }, 130);

    const refine = refineRef.current;
    setRefine(null); // consumed — don't let it leak into a later generation

    (async () => {
      if (!selfieBase64 && !refine) {
        // No real selfie (skipped / no camera) and not a refine → simulate, then land on a placeholder
        // result (no generation id → the result screen shows portraits).
        setTimeout(() => {
          if (!cancelled) doneRef.current = true;
        }, 2400);
        return;
      }
      const name = brief.lookName || (brief.prompt ? brief.prompt.slice(0, 40) : lang === 'fr' ? 'Ma mèche' : 'My look');
      try {
        // Pre-flight credit check — by FAR the most common block. Routing to recharge here doesn't
        // depend on parsing the Functions error shape on-device (which proved unreliable: the no-credit
        // 402 was slipping through to the generic catch). `generate` still re-checks atomically, and
        // the daily/hourly caps below still come back as errors. (rpc never throws → safe pre-flight.)
        const { data: bal } = await supabase.rpc('my_credit_balance');
        if (cancelled) return;
        if (typeof bal === 'number' && bal <= 0) {
          failedRef.current = true;
          goRecharge(true);
          return;
        }
        // The generation now runs server-side, decoupled from this screen: /generate reserves the
        // credit, records a PENDING look, and returns immediately. The pre-flight errors below are
        // the only synchronous ones; the AI itself finishes in the background. On a refine pass the
        // server reloads the original selfie + previous result, so no selfie is sent from here.
        const body = refine ? { refineFrom: refine, brief, name } : { selfieBase64, mimeType, brief, name };
        const { data, error } = await supabase.functions.invoke('generate', { body });
        if (cancelled) return;
        if (error) {
          // The Functions error wraps the Response on `.context` (and the client also surfaces it on
          // `.response`). Read both defensively — the on-device shape isn't always what we expect.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e = error as any;
          const ctx = e?.context ?? e?.response;
          let status: number | undefined = typeof ctx?.status === 'number' ? ctx.status : undefined;
          let code: string | undefined;
          try {
            const body = ctx && typeof ctx.json === 'function' ? await ctx.json() : undefined;
            code = body?.error;
            if (status == null && typeof body?.status === 'number') status = body.status;
          } catch {
            /* body may be unreadable */
          }
          if (status === 402 || code === 'no_credits') {
            failedRef.current = true;
            goRecharge(true);
            return;
          }
          if (code === 'daily_cap') {
            failedRef.current = true;
            // Global free-look ceiling for the day is reached. Paid credits bypass it, so point the
            // user to recharge (their purchased looks go through immediately).
            toast(lang === 'fr' ? "Beaucoup de monde aujourd'hui, on a atteint la limite des essais gratuits. Prends des crédits pour continuer maintenant, ou reviens demain." : "Lots of people today, so we've reached the free-look limit. Grab credits to keep going now, or come back tomorrow.");
            goRecharge();
            return;
          }
          if (status === 429 || code === 'rate_limited') {
            failedRef.current = true;
            // Hourly cap on FREE looks only — paid credits aren't rate-limited, so offer recharge.
            toast(lang === 'fr' ? "Tu as enchaîné beaucoup d'essais gratuits. Prends des crédits pour continuer maintenant, ou réessaie dans quelques minutes." : "You've done a lot of free looks in a row. Grab credits to keep going now, or try again in a few minutes.");
            goRecharge();
            return;
          }
          // Anything else: log the real code for debugging (console/logs only), show the user a clean
          // generic message — never raw error codes.
          failedRef.current = true;
          console.warn('[generate] unhandled error', { status, code });
          toast(lang === 'fr' ? 'Génération impossible, réessaie.' : 'Generation failed, try again.');
          router.back();
          return;
        }
        // Enqueued (status: 'pending'). The credit is reserved and a placeholder look now exists, so
        // refresh both — if the user leaves, the look shows up in "Mes mèches" on its own.
        qc.invalidateQueries({ queryKey: ['credits'] });
        qc.invalidateQueries({ queryKey: ['looks'] });
        const genId = data.id as string;
        const lookId = data.lookId as string | undefined;

        // Watch the generation row while we stay on the loader. Leaving just stops the poll — the
        // background task keeps running and the look lands in the wardrobe regardless.
        const startedAt = Date.now();
        while (!cancelled) {
          await new Promise((r) => setTimeout(r, 1500));
          if (cancelled) return;
          const { data: g } = await supabase.from('generations').select('status').eq('id', genId).single();
          if (cancelled) return;
          if (g?.status === 'done') {
            // Done → the result screen loads the before/after from this generation id (signed there).
            completedRef.current = { id: genId, lookId, name };
            doneRef.current = true;
            return;
          }
          if (g?.status === 'failed') {
            failedRef.current = true;
            toast(lang === 'fr' ? 'Génération impossible, ton crédit est conservé.' : "Generation failed, your credit was kept.");
            router.back();
            return;
          }
          // Taking longer than expected → stop waiting on-screen and let it finish in the
          // background; it'll appear in "Mes mèches" as soon as it's ready.
          if (Date.now() - startedAt > 60000) {
            failedRef.current = true; // suppress the auto-navigation to /result
            toast(lang === 'fr' ? 'Ça prend un peu plus de temps. On le dépose dans Mes mèches dès que c’est prêt.' : "This is taking longer than usual. It'll land in My looks as soon as it's ready.");
            router.back();
            return;
          }
        }
      } catch {
        if (cancelled) return;
        failedRef.current = true;
        toast(lang === 'fr' ? 'Génération impossible, réessaie.' : 'Generation failed, try again.');
        router.back();
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
        // Deterministic: the result screen is driven solely by the generation id. A real generation
        // (normal OR refine) carries its id; the no-camera placeholder path has none.
        if (c) {
          router.replace({ pathname: '/try/result', params: { generationId: c.id, lookId: c.lookId ?? '', name: c.name, fresh: '1' } });
        } else {
          router.replace('/try/result');
        }
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

      {/* scan line — sweeps continuously on its own loop (decoupled from progress %) */}
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
          {t('generating')}
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
          {lang === 'fr' ? '~ 20 secondes · inclus' : '~ 20 seconds'}
        </MText>
      </View>
    </View>
  );
}

import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useQueryClient } from '@tanstack/react-query';
import { useSaveLook, useSession } from '@meche/api-client';
import { MPAL, MText, MPortrait, useLang, useT, useToast } from '@meche/ui';
import { supabase } from '../../lib/supabase';
import { useTryStore } from '../../lib/tryStore';

// B2C · Génération (09) — dark loader while the real AI runs (/generate Edge Function → Gemini).
// Progress holds at ~92% until the result returns, then completes and reveals the before/after.
const ACCENT = MPAL.sable;
const STEPS_FR = ['ANALYSE DU VISAGE', 'LECTURE DE L’IDÉE', 'COMPOSITION', 'FINALISATION'];
const STEPS_EN = ['FACE ANALYSIS', 'READING THE IDEA', 'COMPOSITION', 'FINALISING'];

export default function Generating() {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const qc = useQueryClient();
  const session = useSession();
  const { mutateAsync: saveLook } = useSaveLook();
  const { selfieBase64, mimeType, brief, setResult } = useTryStore();
  const [pct, setPct] = useState(0);
  const doneRef = useRef(false);
  const failedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const iv = setInterval(() => {
      setPct((p) => {
        const cap = doneRef.current ? 100 : 92; // hold until the result returns
        if (p >= cap) return cap;
        return Math.min(cap, p + (p > 80 ? 2 : 6));
      });
    }, 110);

    (async () => {
      if (!selfieBase64) {
        // No real selfie (skipped / no camera) → simulate and fall back to a placeholder result.
        setTimeout(() => {
          if (!cancelled) {
            setResult(null);
            doneRef.current = true;
          }
        }, 2400);
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke('generate', { body: { selfieBase64, mimeType, brief } });
        if (cancelled) return;
        if (error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctx = (error as any)?.context;
          const status: number | undefined = ctx?.status;
          let code: string | undefined;
          try {
            code = (await ctx?.json?.())?.error;
          } catch {
            /* body may be unreadable */
          }
          if (status === 402 || code === 'no_credits') {
            failedRef.current = true;
            // Pop the loader (so the user can't land back on it) THEN show recharge over the
            // previous screen — closing it returns to the suggestion/idea screen, not the home.
            if (router.canGoBack()) router.back();
            router.push('/recharge?low=1');
            return;
          }
          if (status === 503 || code === 'ai_quota') {
            failedRef.current = true;
            toast(lang === 'fr' ? 'Service IA occupé, réessaie dans un instant.' : 'AI is busy, try again in a moment.');
            router.back();
            return;
          }
          throw error;
        }
        // The generated image is PRIVATE (it's the user's face). Store only the Storage path and
        // mint a short-lived signed URL for immediate display — never a public URL.
        const resultPath = data.resultPath as string;
        const { data: signed } = await supabase.storage.from('generated').createSignedUrl(resultPath, 3600);
        const displayUri = signed?.signedUrl ?? '';
        const name = brief.lookName || (brief.prompt ? brief.prompt.slice(0, 40) : lang === 'fr' ? 'Ma mèche' : 'My look');
        // Auto-save every generation into "Mes essais" (generation_id set). image_url holds the
        // private path; the wardrobe signs it on read.
        let savedLookId: string | undefined;
        if (session) {
          try {
            savedLookId = await saveLook({ userId: session.user.id, name, imageUrl: resultPath, generationId: data.id, loved: false });
          } catch {
            /* non-blocking */
          }
        }
        setResult({ uri: displayUri, match: data.match, generationId: data.id, name, savedLookId });
        qc.invalidateQueries({ queryKey: ['credits'] });
        doneRef.current = true;
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
      const to = setTimeout(() => router.replace('/try/result'), 300);
      return () => clearTimeout(to);
    }
  }, [pct, router]);

  const steps = lang === 'fr' ? STEPS_FR : STEPS_EN;
  const step = steps[Math.min(3, Math.floor(pct / 25))];

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0908' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.85 }}>
        {selfieBase64 ? (
          <Image source={{ uri: `data:${mimeType};base64,${selfieBase64}` }} style={{ flex: 1 }} contentFit="cover" />
        ) : (
          <MPortrait hair="medium" mood="warm" tint={ACCENT} />
        )}
      </View>
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      {/* scan line */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: `${pct * 0.85}%`, height: 2, backgroundColor: ACCENT, shadowColor: ACCENT, shadowOpacity: 0.9, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } }} />

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
            {pct}%
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

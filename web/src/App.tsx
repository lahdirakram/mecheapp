import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { IS_STAGING, PADDLE_READY } from './lib/config';
import { prepareSelfie, selfieFromBlob, ImageError, type PreparedSelfie } from './lib/image';
import { clearDraft, loadDraft, saveDraft } from './lib/draft';
import {
  creditBalance,
  failureMessage,
  resumableGeneration,
  signedResultUrl,
  startTryOn,
  TryOnError,
  unlockGeneration,
  waitForCredits,
  waitForGeneration,
} from './lib/tryon';
import { signInWith, type Provider } from './lib/auth';
import { checkout, PaddleError } from './lib/paddle';
import type { Pack } from './lib/packs';
import { SiteFooter, Steps, Wordmark } from './ui';
import {
  AccountScreen,
  GeneratingScreen,
  LookScreen,
  PaywallScreen,
  PortraitScreen,
  ResultScreen,
} from './screens';

export type Step = 'portrait' | 'look' | 'account' | 'generating' | 'paywall' | 'result';

const STEP_RAIL: Record<Step, 1 | 2 | 3 | 4> = {
  portrait: 1,
  look: 2,
  account: 3,
  generating: 4,
  paywall: 4,
  result: 4,
};

const CAPTIONS: Record<Step, string> = {
  portrait: 'Un portrait de face, bien éclairé, cheveux dégagés du visage.',
  look: 'Ton portrait. La coupe sera posée dessus, ton visage ne change pas.',
  account: 'Ton portrait. La coupe sera posée dessus, ton visage ne change pas.',
  generating: 'Ton visage, ta lumière et ton cadrage sont conservés.',
  paywall: "Aperçu basse définition. L'image nette attend, elle n'a jamais quitté le serveur.",
  result: 'Même visage, même lumière, même cadrage.',
};

export function App() {
  const [step, setStep] = useState<Step>('portrait');
  const [session, setSession] = useState<Session | null>(null);
  const [selfie, setSelfie] = useState<PreparedSelfie | null>(null);
  const [look, setLook] = useState<{ name: string; prompt?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);

  // Result state
  const [genId, setGenId] = useState<string | null>(null);
  const [teaserUrl, setTeaserUrl] = useState<string | null>(null);
  const [clearUrl, setClearUrl] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Session, restored on load and kept in sync.
  //
  // `getSession()` only reads localStorage — it happily returns a token for a user who no longer
  // exists. That is not hypothetical: delete an account server-side and the browser keeps a session
  // whose uid matches nothing. Every query then runs as a ghost, `my_credit_balance()` sums zero
  // rows and answers 0, and the funnel tells the visitor "ton essai offert a déjà été utilisé" —
  // pointing at the one explanation that is certainly wrong.
  //
  // `getUser()` asks the SERVER, so it is the only way to know the session is still real. On failure
  // we sign out and fall back to the signed-out funnel, which is the honest state.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { error } = await supabase.auth.getUser();
      // Only a REJECTION means the session is dead. A network failure must not sign anyone out:
      // `getUser()` errors on offline too, and dropping a valid session because the wifi blipped
      // would lose the funnel for someone who did nothing wrong. Auth rejections carry an HTTP
      // status; transient fetch failures do not.
      const rejected = error && [401, 403, 404].includes(error.status ?? 0);
      if (rejected) {
        console.warn('[auth] session belongs to a user that no longer exists, signing out');
        await supabase.auth.signOut().catch(() => {});
        setSession(null);
        return;
      }
      setSession(data.session);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Coming back from a Google or Apple redirect: the page was reloaded, so React state is gone and
  // the photo lives in IndexedDB. Restore it and pick the funnel back up. Runs once, before the
  // first paint of a resumable state, so the visitor never sees the empty portrait step flash.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current) return;
    resumed.current = true;
    void (async () => {
      const draft = await loadDraft();
      if (!draft) return;
      const restored = await selfieFromBlob(draft.blob);
      setSelfie(restored);
      const restoredLook = draft.lookName
        ? { name: draft.lookName, ...(draft.lookPrompt ? { prompt: draft.lookPrompt } : {}) }
        : null;
      setLook(restoredLook);

      // Signed in during the round trip and the look survived? Go straight on; making someone press
      // "Continuer" again after an interstitial sign-in is pure friction.
      const { data } = await supabase.auth.getSession();
      if (data.session && restoredLook) void runWith(data.session, restored, restoredLook);
      else setStep(restoredLook ? 'look' : 'portrait');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nothing tells a web visitor their try-on finished: `generate` only pushes to Expo device tokens
  // and a browser has none. Coming back to this page is the ONLY way to find the result, so make
  // that work: pick up anything still running or still locked (paid for but not revealed).
  const checkedResumable = useRef(false);
  useEffect(() => {
    if (!session || checkedResumable.current) return;
    // The draft restore above may already have relaunched a try-on in this same mount. Both effects
    // would otherwise drive the funnel at once and fight over `step`.
    if (step !== 'portrait' || genId) return;
    checkedResumable.current = true;
    void (async () => {
      const row = await resumableGeneration();
      if (!row) return;
      setGenId(row.id);
      const name = row.brief?.lookName || row.brief?.prompt || 'ton essai';
      setLook({ name });

      if (row.status === 'failed') {
        // Say what happened instead of dropping them on an empty first step with no explanation.
        // We no longer hold their photo (the draft is cleared once the server has it), so the only
        // way forward is a new one.
        setError(failureMessage(row));
        setGenId(null);
        setStep('portrait');
        return;
      }

      if (row.status === 'pending') {
        setStep('generating');
        try {
          const finished = await waitForGeneration(row.id);
          const url = finished.result_path ? await signedResultUrl(finished.result_path) : null;
          if (finished.locked) {
            setTeaserUrl(url);
            setStep('paywall');
          } else {
            setClearUrl(url);
            setCredits(await creditBalance());
            setStep('result');
          }
        } catch {
          setStep('portrait');
        }
        return;
      }

      const url = row.result_path ? await signedResultUrl(row.result_path) : null;
      if (row.locked) {
        // Waiting to be paid for.
        setTeaserUrl(url);
        setStep('paywall');
      } else {
        // Already clear: hand it straight back.
        setClearUrl(url);
        setCredits(await creditBalance());
        setStep('result');
      }
    })();
    // Intentionally keyed on `session` only: `step`/`genId` are read as a one-shot guard, and adding
    // them would re-run this effect as the funnel advances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Release the object URL when a selfie is replaced or dropped, or the tab leaks blobs.
  useEffect(() => {
    return () => {
      if (selfie) URL.revokeObjectURL(selfie.previewUrl);
    };
  }, [selfie]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const pickFile = useCallback(async (file: File) => {
    setError(null);
    try {
      const prepared = await prepareSelfie(file);
      setSelfie((prev) => {
        if (prev) URL.revokeObjectURL(prev.previewUrl);
        return prepared;
      });
      setStep('look');
    } catch (e) {
      setError(e instanceof ImageError ? e.message : "Cette photo n'a pas pu être préparée.");
    }
  }, []);

  /**
   * Enqueue the try-on and watch it.
   *
   * Takes the selfie and look as ARGUMENTS rather than reading state, because the resume-after-OAuth
   * path calls it in the same tick it restores them, when state has not settled yet.
   */
  const runWith = useCallback(
    async (_session: Session, activeSelfie: PreparedSelfie, activeLook: { name: string; prompt?: string }) => {
      setError(null);
      setStep('generating');

      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      try {
        // Pre-flight: by far the most common block, and cheap. `generate` re-checks atomically.
        const balance = await creditBalance();
        if (balance <= 0) {
          // No welcome credit left and nothing purchased. Nothing to show yet, so the paywall would
          // be selling an image that does not exist. Send them back with a clear reason instead.
          setError(
            "Ton essai offert a déjà été utilisé sur ce compte. Prends des crédits pour lancer un nouvel essai.",
          );
          setStep('look');
          return;
        }

        const enqueued = await startTryOn({
          selfieBase64: activeSelfie.base64,
          mimeType: activeSelfie.mimeType,
          brief: activeLook.prompt
            ? { prompt: activeLook.prompt, lookName: activeLook.name }
            : { lookName: activeLook.name },
          name: activeLook.name,
        });
        setGenId(enqueued.id);
        // The server holds the image now, so the local copy has no reason to exist. Clearing here
        // rather than at the end of the funnel keeps the face photo on disk for the shortest
        // possible window.
        void clearDraft();

        const row = await waitForGeneration(enqueued.id, controller.signal);
        if (controller.signal.aborted) return;

        if (row.status === 'failed' || !row.result_path) {
          // Since 0030 the credit is reserved in the BACKGROUND, just before the paid Gemini call,
          // so a race that passes the synchronous balance check can still fail there. That lands as
          // status 'failed' with error 'no_credits' rather than a 402, and a blanket "ton crédit a
          // été conservé" would be false: there was no credit to keep. failureMessage() maps each
          // server reason to something true.
          setError(failureMessage(row));
          setStep('look');
          return;
        }

        const url = await signedResultUrl(row.result_path);
        if (row.locked) {
          setTeaserUrl(url);
          setStep('paywall');
        } else {
          // Not locked: either the visitor already holds purchased credits, or the teaser pipeline
          // failed open server-side. Either way the image is theirs, so skip the paywall.
          setClearUrl(url);
          setCredits(await creditBalance());
          setStep('result');
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof TryOnError ? e.message : "L'essai n'a pas pu être lancé. Réessaie.");
        setStep('look');
      }
    },
    [],
  );

  /** Same thing, driven from current state. */
  const run = useCallback(
    (activeSession: Session) => {
      if (!selfie || !look) return;
      void runWith(activeSession, selfie, look);
    },
    [selfie, look, runWith],
  );

  /** Called by the account screen once a session exists. */
  const onAuthenticated = useCallback(
    (s: Session) => {
      setSession(s);
      void run(s);
    },
    [run],
  );

  /**
   * Google / Apple. Persisting the draft BEFORE handing over to the provider is the whole point:
   * the redirect unloads this page, so anything not written to disk here is gone when we come back.
   */
  const startProviderSignIn = useCallback(
    async (provider: Provider) => {
      if (selfie) {
        await saveDraft({
          blob: selfie.blob,
          ...(look?.name ? { lookName: look.name } : {}),
          ...(look?.prompt ? { lookPrompt: look.prompt } : {}),
        });
      }
      await signInWith(provider);
    },
    [selfie, look],
  );

  const goFromLook = useCallback(() => {
    // Already signed in from an earlier try-on? Skip the account step entirely.
    if (session) void run(session);
    else setStep('account');
  }, [session, run]);

  /**
   * Pay, then reveal.
   *
   * Order matters and is the whole security story: the credit must exist BEFORE `unlock` is called,
   * and only the webhook can create it. So we take payment, then WAIT FOR THE LEDGER to move, then
   * unlock. The browser's checkout event is never treated as authorisation.
   *
   * Someone who already holds credits (bought earlier, or came back to a locked result) skips the
   * checkout entirely and just unlocks.
   */
  const payAndReveal = useCallback(
    async (pack: Pack | undefined) => {
      if (!genId) return;
      setError(null);
      setRevealing(true);
      try {
        if ((await creditBalance()) <= 0) {
          if (!PADDLE_READY || !pack?.paddle_price_id) {
            // No payment configured for this environment. Nothing is given away: `unlock` charges a
            // credit server-side, so the worst case is the honest error below.
            throw new TryOnError('no_credits', "Le paiement n'est pas encore disponible ici.");
          }
          await checkout({
            priceId: pack.paddle_price_id,
            userId: session?.user.id ?? '',
            ...(session?.user.email ? { email: session.user.email } : {}),
          });
          // Paid, but not necessarily granted yet.
          await waitForCredits();
        }

        await unlockGeneration(genId);
        const row = await waitForGeneration(genId).catch(() => null);
        const path = row?.result_path ?? null;
        setClearUrl(path ? await signedResultUrl(path) : null);
        setCredits(await creditBalance());
        setStep('result');
      } catch (e) {
        if (e instanceof PaddleError) setError(e.message);
        else if (e instanceof TryOnError) setError(e.message);
        else setError("La révélation a échoué. Réessaie, aucun crédit n'a été perdu.");
      } finally {
        setRevealing(false);
      }
    },
    [genId, session],
  );

  const startOver = useCallback(() => {
    setGenId(null);
    setTeaserUrl(null);
    setClearUrl(null);
    setError(null);
    setStep('look');
  }, []);

  const frameImage =
    step === 'result' ? clearUrl : step === 'paywall' ? teaserUrl : (selfie?.previewUrl ?? null);

  return (
    <>
      {IS_STAGING && <div className="m-env">Backend staging</div>}

      <div className="m-shell">
        <header className="m-top">
          <Wordmark />
          <div className="m-top-right">
            {step === 'result' && credits > 0 && (
              <span className="m-credits">
                {credits} essai{credits > 1 ? 's' : ''}
              </span>
            )}
            <span className="m-lang">FR</span>
          </div>
        </header>

        <Steps active={STEP_RAIL[step]} />

        <div className="m-bench">
          {/* Before a result exists the frame is only context, so on a phone it must not eat the
              whole first screen and push the actual control below the fold. Once there IS a result,
              the frame is the product and gets all the room it wants. */}
          <div
            className="m-frame-wrap"
            data-compact={step === 'paywall' || step === 'result' ? undefined : '1'}
          >
            <div className="m-frame">
              {!frameImage && (
                <div className="m-empty">
                  <span className="glyph" aria-hidden="true">
                    ◌
                  </span>
                  <p>Ton portrait apparaît ici</p>
                </div>
              )}
              {frameImage && (
                <div className="m-shot" data-on="1">
                  <img
                    src={frameImage}
                    alt={
                      step === 'result'
                        ? `Résultat, ${look?.name ?? 'ton essai'}`
                        : step === 'paywall'
                          ? 'Aperçu flouté de ton résultat'
                          : 'Ton portrait'
                    }
                    style={step === 'paywall' ? { filter: 'blur(1.5px)', transform: 'scale(1.02)' } : undefined}
                  />
                </div>
              )}
              {step === 'generating' && <div className="m-scan" />}
              {(step === 'paywall' || step === 'result') && (
                <span className={`m-badge${step === 'result' ? ' m-badge--ok' : ''}`}>
                  <span className="lk" aria-hidden="true">
                    ⬤
                  </span>{' '}
                  {step === 'paywall' ? 'Aperçu verrouillé' : 'Résultat net'}
                </span>
              )}
            </div>
            <p className="m-caption">{CAPTIONS[step]}</p>
          </div>

          <div className="m-panel">
            {step === 'portrait' && <PortraitScreen onPick={pickFile} error={error} />}
            {step === 'look' && (
              <LookScreen
                selected={look}
                onSelect={setLook}
                onContinue={goFromLook}
                onBack={() => setStep('portrait')}
                error={error}
              />
            )}
            {step === 'account' && (
              <AccountScreen onAuthenticated={onAuthenticated} onProvider={startProviderSignIn} />
            )}
            {step === 'generating' && <GeneratingScreen lookName={look?.name ?? 'ton essai'} />}
            {step === 'paywall' && (
              <PaywallScreen onReveal={payAndReveal} busy={revealing} error={error} />
            )}
            {step === 'result' && (
              <ResultScreen
                lookName={look?.name ?? 'ton essai'}
                imageUrl={clearUrl}
                credits={credits}
                onAgain={startOver}
              />
            )}
          </div>
        </div>

      </div>

      <SiteFooter />
    </>
  );
}

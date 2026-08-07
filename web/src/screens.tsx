import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthError, OTP_LENGTH, sendCode, verifyCode, type Provider } from './lib/auth';
import { supabase } from './lib/supabase';
import { APPSTORE_URL, PLAY_URL, platform } from './lib/config';
import { fetchLooks, type Look } from './lib/looks';
import { badgeLabel, defaultPackId, fetchPacks, type Pack } from './lib/packs';
import { tr } from './lib/i18n';
import { Alert, AppleMark, Arrow, GoogleMark, Note } from './ui';

/* ── 01 Portrait ─────────────────────────────────────────────────────────── */

export function PortraitScreen({
  onPick,
  error,
}: {
  onPick: (file: File) => void;
  error: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const t = tr();

  return (
    <section>
      <p className="m-kicker">{t.portrait.kicker}</p>
      <h2 className="m-h">
        {t.portrait.h}<em>{t.portrait.hEm}</em>
      </h2>
      <p className="m-sub">{t.portrait.sub}</p>

      <div
        className="m-drop"
        role="button"
        tabIndex={0}
        style={dragging ? { borderColor: '#B07F3C', background: '#F0E2CF' } : undefined}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onPick(file);
        }}
      >
        <span className="big">{t.portrait.dropBig}</span>
        {/* Pas de taille annoncée : la photo est redimensionnée et convertie en JPEG dans le
            navigateur avant l'envoi, donc le poids du fichier d'origine n'a aucune importance. */}
        <span className="small">{t.portrait.dropSmall}</span>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          // Reset so picking the same file twice still fires a change event.
          e.target.value = '';
        }}
      />

      {error && <Alert>{error}</Alert>}

      <Note>{t.portrait.note}</Note>
    </section>
  );
}

/* ── 02 Look ─────────────────────────────────────────────────────────────── */

export function LookScreen({
  selected,
  onSelect,
  onContinue,
  onBack,
  error,
}: {
  selected: { name: string; prompt?: string } | null;
  onSelect: (look: { name: string; prompt?: string } | null) => void;
  onContinue: () => void;
  onBack: () => void;
  error: string | null;
}) {
  const [looks, setLooks] = useState<Look[]>([]);
  // Seeded from the selection so a look restored from a draft (after an OAuth redirect) shows its
  // text back in the field. Without this the box reads as empty while "Continuer" is enabled.
  const [idea, setIdea] = useState(selected?.prompt ?? '');
  const t = tr();

  useEffect(() => {
    void fetchLooks(4).then(setLooks);
  }, []);

  return (
    <section>
      <p className="m-kicker">{t.look.kicker}</p>
      <h2 className="m-h">
        {t.look.h}<em>{t.look.hEm}</em>
      </h2>
      <p className="m-sub">{t.look.sub}</p>

      {looks.length > 0 && (
        <div className="m-looks">
          {looks.map((look) => (
            <button
              key={look.id}
              type="button"
              className="m-look"
              data-src={look.fromFeed ? 'feed' : undefined}
              aria-pressed={selected?.name === look.name && !idea}
              onClick={() => {
                setIdea('');
                onSelect({ name: look.name });
              }}
            >
              {look.imageUrl && <img src={look.imageUrl} alt={look.name} loading="lazy" />}
              <span className="nm">{look.name}</span>
              {look.fromFeed && <span className="src" title={t.look.fromFeed} />}
            </button>
          ))}
        </div>
      )}

      <label className="m-field">
        <span className="m-label">{t.look.fieldLabel}</span>
        <textarea
          className="m-input"
          value={idea}
          maxLength={240}
          placeholder={t.look.placeholder}
          onChange={(e) => {
            const value = e.target.value;
            setIdea(value);
            const trimmed = value.trim();
            onSelect(trimmed ? { name: trimmed.slice(0, 40), prompt: trimmed } : null);
          }}
        />
      </label>

      {error && <Alert>{error}</Alert>}

      {/* `m-row--sticky` : sur mobile cette rangée se colle en bas (voir styles.css). C'est l'écran
          où l'action était le plus loin, 464px sous la ligne avant refonte. */}
      <div className="m-row m-row--sticky">
        <button className="m-btn m-btn--primary" type="button" disabled={!selected} onClick={onContinue}>
          {t.look.continue} <Arrow />
        </button>
        <button className="m-btn m-btn--ghost" type="button" onClick={onBack}>
          {t.look.changePhoto}
        </button>
      </div>
    </section>
  );
}

/* ── 03 Compte ───────────────────────────────────────────────────────────── */

export function AccountScreen({
  onAuthenticated,
  onProvider,
}: {
  onAuthenticated: (s: Session) => void;
  onProvider: (provider: Provider) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = tr();

  async function provider(p: Provider) {
    setBusy(true);
    setError(null);
    try {
      await onProvider(p);
      // On success the browser is already navigating away; nothing after this runs.
    } catch (e) {
      setError(e instanceof AuthError ? e.message : tr().account.startFailed);
      setBusy(false);
    }
  }

  async function submitEmail() {
    setBusy(true);
    setError(null);
    try {
      await sendCode(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof AuthError ? e.message : tr().account.sendFailed);
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(value: string) {
    setBusy(true);
    setError(null);
    try {
      await verifyCode(email, value);
      const { data } = await supabase.auth.getSession();
      if (data.session) onAuthenticated(data.session);
      else setError(tr().account.sessionFailed);
    } catch (e) {
      setError(e instanceof AuthError ? e.message : tr().account.codeInvalid);
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  if (!sent) {
    return (
      <section>
        <p className="m-kicker">{t.account.kicker}</p>
        <h2 className="m-h">
          {t.account.h}<em>{t.account.hEm}</em>
        </h2>
        <p className="m-sub">{t.account.sub}</p>

        <div className="m-providers">
          <button
            className="m-btn m-btn--ghost m-btn--wide"
            type="button"
            data-busy={busy ? '1' : undefined}
            onClick={() => void provider('google')}
          >
            <GoogleMark /> {t.account.google}
          </button>
          <button
            className="m-btn m-btn--ghost m-btn--wide"
            type="button"
            data-busy={busy ? '1' : undefined}
            onClick={() => void provider('apple')}
          >
            <AppleMark /> {t.account.apple}
          </button>
        </div>

        <div className="m-or">{t.account.or}</div>

        <label className="m-field">
          <span className="m-label">{t.account.emailLabel}</span>
          <input
            className="m-input"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            placeholder={t.account.emailPlaceholder}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && email.trim()) void submitEmail();
            }}
          />
        </label>

        {error && <Alert>{error}</Alert>}

        <button
          className="m-btn m-btn--primary m-btn--wide"
          type="button"
          data-busy={busy ? '1' : undefined}
          disabled={!email.trim()}
          onClick={() => void submitEmail()}
        >
          {busy ? t.account.sending : t.account.sendCode} <Arrow />
        </button>

        <Note>{t.account.note(OTP_LENGTH)}</Note>
      </section>
    );
  }

  return (
    <section>
      <p className="m-kicker">{t.account.kicker}</p>
      <h2 className="m-h">
        {t.account.sentH}<em>{t.account.sentHEm}</em>
      </h2>
      <p className="m-sub">
        {t.account.sentSub1}<strong>{email}</strong>{t.account.sentSub2(OTP_LENGTH)}
      </p>

      <label className="m-field">
        <span className="m-label">{t.account.codeLabel}</span>
        <input
          className="m-otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={OTP_LENGTH}
          value={code}
          placeholder="000000"
          onChange={(e) => {
            // Hard cut at OTP_LENGTH, then auto-verify. This is why the length must stay fixed at 6:
            // a variable length means never knowing when the entry is finished.
            const digits = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
            setCode(digits);
            if (digits.length === OTP_LENGTH && !busy) void submitCode(digits);
          }}
        />
      </label>

      {error && <Alert>{error}</Alert>}

      <div className="m-row" style={{ marginTop: 16 }}>
        <button
          className="m-link"
          type="button"
          onClick={() => {
            setSent(false);
            setCode('');
            setError(null);
          }}
        >
          {t.account.changeAddress}
        </button>
      </div>
    </section>
  );
}

/* ── 04 Génération ───────────────────────────────────────────────────────── */

export function GeneratingScreen({ lookName }: { lookName: string }) {
  const [elapsed, setElapsed] = useState(0);
  const t = tr();

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Copy advances on a rough schedule; the real signal is the poll in App, not this clock.
  const phase = Math.min(Math.floor(elapsed / 6), t.generating.phases.length - 1);
  // Ease toward 95% so the bar never sits full while the work is still running.
  const pct = Math.min(95, Math.round((1 - Math.exp(-elapsed / 14)) * 100));

  return (
    <section>
      <p className="m-kicker">{t.generating.kicker}</p>
      <h2 className="m-h">
        {t.generating.h}<em>{t.generating.hEm}</em>
      </h2>
      <p className="m-sub">{t.generating.phases[phase]}</p>

      <div className="m-prog">
        <i style={{ width: `${pct}%` }} />
      </div>
      <p className="m-tick">
        {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')} ·{' '}
        {lookName}
      </p>

      {/* NE PAS promettre un email ici : `generate` ne notifie que par push Expo, et un navigateur
          n'a pas d'appareil enregistré. Revenir sur la page est le seul moyen de retrouver un
          résultat, et c'est ce que fait la reprise automatique dans App.tsx. */}
      <Note>{t.generating.note}</Note>
    </section>
  );
}

/* ── 05b Révélation ──────────────────────────────────────────────────────── */

/**
 * L'attente entre « payé » et « image nette ».
 *
 * C'est le moment le plus anxiogène du tunnel : l'argent est parti et rien n'a encore bougé à
 * l'écran. Un simple bouton grisé y répond mal, parce qu'il ne dit ni que le paiement a marché ni
 * ce qu'on attend. Le trajet a deux temps réels, et chacun a sa phrase :
 *   1. `confirming` — Paddle a encaissé, on attend le webhook qui crédite le compte,
 *   2. `fetching`   — les crédits sont là, `unlock` a débité, on récupère l'image pleine définition.
 *
 * Contrairement à `GeneratingScreen`, la progression ici n'est PAS une horloge décorative : les
 * phases viennent d'événements réels, donc la barre a le droit d'être franche.
 */
const REVEAL_PCT = { confirming: 45, fetching: 82 } as const;

export function RevealingScreen({ phase }: { phase: 'confirming' | 'fetching' }) {
  const t = tr();
  const copy = t.revealing[phase];
  return (
    <section>
      <p className="m-kicker">{t.revealing.kicker}</p>
      <h2 className="m-h">
        {copy.head} <em>{copy.em}</em>
      </h2>
      <p className="m-sub">{copy.sub}</p>

      <div className="m-prog">
        <i style={{ width: `${REVEAL_PCT[phase]}%` }} />
      </div>

      {/* La reprise automatique (`resumableGeneration`) rend cette phrase vraie : un résultat payé
          et débloqué se retrouve en revenant sur la page. Ne pas la promettre sans elle. */}
      <Note>{t.revealing.note}</Note>
    </section>
  );
}

/* ── 05 Paywall ──────────────────────────────────────────────────────────── */

export function PaywallScreen({
  onReveal,
  busy,
  error,
}: {
  onReveal: (pack: Pack | undefined) => void;
  busy: boolean;
  error: string | null;
}) {
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const t = tr();

  useEffect(() => {
    void fetchPacks().then((rows) => {
      setPacks(rows);
      setSelected((cur) => cur ?? defaultPackId(rows));
    });
  }, []);

  return (
    <section>
      <p className="m-kicker">{t.paywall.kicker}</p>
      <h2 className="m-h">
        {t.paywall.h}<em>{t.paywall.hEm}</em>
      </h2>
      <p className="m-sub">{t.paywall.sub}</p>

      {/* An empty list here is a TOTAL failure of the money screen, and it failed silently once
          already (the query selected a column the migration had not created yet). Never render an
          empty box: say something is wrong. */}
      {packs?.length === 0 && <Alert>{t.paywall.packsFailed}</Alert>}

      <div className="m-packs">
        {(packs ?? []).map((pack) => {
          const badge = badgeLabel(pack.badge);
          return (
            <button
              key={pack.id}
              type="button"
              className="m-pack"
              aria-pressed={selected === pack.id}
              onClick={() => setSelected(pack.id)}
            >
              <span className="radio" aria-hidden="true" />
              <span className="body">
                <span className="ttl">
                  {t.paywall.packTitle}<em>{t.paywall.packExtra(pack.credits - 1)}</em>
                  {badge && <span className="m-tag">{badge}</span>}
                </span>
                <span className="sub">{t.paywall.perTry(pack.unit)}</span>
              </span>
              <span className="price">{pack.price}</span>
            </button>
          );
        })}
      </div>

      {error && <Alert>{error}</Alert>}

      <button
        className="m-btn m-btn--primary m-btn--wide"
        type="button"
        data-busy={busy ? '1' : undefined}
        disabled={!packs?.length}
        onClick={() => onReveal((packs ?? []).find((p) => p.id === selected))}
      >
        {busy ? t.paywall.revealing : t.paywall.reveal} <Arrow />
      </button>

      <div className="m-trust">
        {t.paywall.trust.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
    </section>
  );
}

/* ── 06 Résultat ─────────────────────────────────────────────────────────── */

/**
 * Cross-sell to the app, shown ONLY after the reveal. Deliberately not earlier: sending someone to
 * an app store mid-funnel is sending them away before they have paid.
 *
 * It works because both surfaces are the same Supabase project, so the credits and the try-on
 * history are already on the account. The sign-in wording is the awkward part and it is honest on
 * purpose: the app authenticates with email + PASSWORD, and a web visitor who used the email code
 * never set one. Google and Apple carry over cleanly (the app uses signInWithIdToken).
 */
function ContinueInApp({ credits }: { credits: number }) {
  const os = platform();
  const t = tr();
  const href = os === 'android' ? PLAY_URL : APPSTORE_URL;

  return (
    <div className="m-app">
      <p className="m-app-title">{t.result.appTitle}</p>
      <p className="m-app-body">
        {credits > 0 ? (
          <>
            {t.result.appBodyCredits1}
            <strong>{t.result.appBodyCreditsStrong(credits)}</strong>
            {t.result.appBodyCredits2}
          </>
        ) : (
          <>{t.result.appBody}</>
        )}
      </p>
      <a className="m-btn m-btn--ghost" href={href} target="_blank" rel="noopener noreferrer">
        {t.result.appDownload}
      </a>
      {/* Un acheteur web n'a JAMAIS de mot de passe : il s'inscrit par code, sans en choisir un.
          Le detour par « Mot de passe oublié » etait le contournement d'avant `(auth)/code.tsx`.
          Maintenant que l'app a son bouton dedie, on le nomme tel quel : une consigne qui ne
          correspond pas au libelle affiche coute plus qu'elle n'aide. Garder ce texte aligne sur
          `signin_code_link` du dictionnaire si le libelle change (les DEUX langues du studio). */}
      <p className="m-app-fine">{t.result.appFine}</p>
    </div>
  );
}

export function ResultScreen({
  lookName,
  imageUrl,
  credits,
  onAgain,
}: {
  lookName: string;
  imageUrl: string | null;
  credits: number;
  onAgain: () => void;
}) {
  const t = tr();
  return (
    <section>
      <p className="m-kicker">{lookName}</p>
      <h2 className="m-h">
        {t.result.h1}<em>{t.result.hEm}</em>{t.result.h2(lookName)}
      </h2>
      <p className="m-sub">
        {t.result.sub}
        {credits > 0 && (
          <>
            {' '}
            {t.result.remaining1}<strong>{t.result.remainingStrong(credits)}</strong>{t.result.remaining2}
          </>
        )}
      </p>

      <div className="m-acts">
        {imageUrl && (
          <a className="m-btn m-btn--primary" href={imageUrl} download={`meche-${lookName}.jpg`}>
            {t.result.download}
          </a>
        )}
        <button className="m-btn m-btn--ghost" type="button" onClick={onAgain}>
          {t.result.again}
        </button>
      </div>

      <ContinueInApp credits={credits} />
    </section>
  );
}

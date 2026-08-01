import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthError, OTP_LENGTH, sendCode, verifyCode, type Provider } from './lib/auth';
import { supabase } from './lib/supabase';
import { APPSTORE_URL, PLAY_URL, platform } from './lib/config';
import { fetchLooks, type Look } from './lib/looks';
import { badgeLabel, defaultPackId, fetchPacks, type Pack } from './lib/packs';
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

  return (
    <section>
      <p className="m-kicker">Étape 01</p>
      <h2 className="m-h">
        Commence par <em>ton visage.</em>
      </h2>
      <p className="m-sub">
        Pas un mannequin, pas une simulation générique. La coupe est posée sur ta photo, avec ton
        visage, ta carnation et ta lumière.
      </p>

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
        <span className="big">Dépose ta photo</span>
        {/* Pas de taille annoncée : la photo est redimensionnée et convertie en JPEG dans le
            navigateur avant l'envoi, donc le poids du fichier d'origine n'a aucune importance. */}
        <span className="small">ou clique pour choisir un fichier · JPG, PNG ou WebP</span>
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

      <Note>
        Ta photo sert à générer ton essai, et à rien d'autre. Elle n'est jamais publiée, jamais
        utilisée pour entraîner un modèle. Tu peux la supprimer à tout moment.
      </Note>
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

  useEffect(() => {
    void fetchLooks(4).then(setLooks);
  }, []);

  return (
    <section>
      <p className="m-kicker">Étape 02</p>
      <h2 className="m-h">
        Choisis, ou <em>décris.</em>
      </h2>
      <p className="m-sub">
        Une sélection éditoriale, ou tes propres mots. Tu n'as pas besoin de connaître le vocabulaire
        du salon.
      </p>

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
              {look.fromFeed && <span className="src" title="Repéré dans le feed" />}
            </button>
          ))}
        </div>
      )}

      <label className="m-field">
        <span className="m-label">Ou dis-le avec tes mots</span>
        <textarea
          className="m-input"
          value={idea}
          maxLength={240}
          placeholder="un carré flou, plus court derrière, reflets miel"
          onChange={(e) => {
            const value = e.target.value;
            setIdea(value);
            const trimmed = value.trim();
            onSelect(trimmed ? { name: trimmed.slice(0, 40), prompt: trimmed } : null);
          }}
        />
      </label>

      {error && <Alert>{error}</Alert>}

      <div className="m-row">
        <button className="m-btn m-btn--primary" type="button" disabled={!selected} onClick={onContinue}>
          Continuer <Arrow />
        </button>
        <button className="m-btn m-btn--ghost" type="button" onClick={onBack}>
          Changer de photo
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

  async function provider(p: Provider) {
    setBusy(true);
    setError(null);
    try {
      await onProvider(p);
      // On success the browser is already navigating away; nothing after this runs.
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "La connexion n'a pas pu démarrer.");
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
      setError(e instanceof AuthError ? e.message : "Le code n'a pas pu être envoyé.");
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
      else setError('La session ne s’est pas ouverte. Redemande un code.');
    } catch (e) {
      setError(e instanceof AuthError ? e.message : 'Ce code est invalide ou expiré.');
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  if (!sent) {
    return (
      <section>
        <p className="m-kicker">Étape 03</p>
        <h2 className="m-h">
          Où on t'envoie <em>ton essai.</em>
        </h2>
        <p className="m-sub">
          La génération prend une trentaine de secondes. Ton essai reste rattaché à ce compte, donc
          tu le retrouves en revenant sur cette page.
        </p>

        <div className="m-providers">
          <button
            className="m-btn m-btn--ghost m-btn--wide"
            type="button"
            data-busy={busy ? '1' : undefined}
            onClick={() => void provider('google')}
          >
            <GoogleMark /> Continuer avec Google
          </button>
          <button
            className="m-btn m-btn--ghost m-btn--wide"
            type="button"
            data-busy={busy ? '1' : undefined}
            onClick={() => void provider('apple')}
          >
            <AppleMark /> Continuer avec Apple
          </button>
        </div>

        <div className="m-or">ou</div>

        <label className="m-field">
          <span className="m-label">Ton email</span>
          <input
            className="m-input"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            placeholder="prenom@email.com"
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
          {busy ? 'Envoi…' : 'Recevoir mon code'} <Arrow />
        </button>

        <Note>
          Pas de mot de passe à retenir. On envoie un code à {OTP_LENGTH} chiffres, valable quelques
          minutes.
        </Note>
      </section>
    );
  }

  return (
    <section>
      <p className="m-kicker">Étape 03</p>
      <h2 className="m-h">
        Ton code est <em>parti.</em>
      </h2>
      <p className="m-sub">
        On l'a envoyé à <strong>{email}</strong>. Il fait {OTP_LENGTH} chiffres et se vérifie tout
        seul dès le dernier.
      </p>

      <label className="m-field">
        <span className="m-label">Le code</span>
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
          Changer d'adresse ou redemander un code
        </button>
      </div>
    </section>
  );
}

/* ── 04 Génération ───────────────────────────────────────────────────────── */

const GEN_COPY = [
  'Lecture de ton portrait.',
  'Repérage de la ligne de cheveux.',
  'Pose de la coupe, brin par brin.',
  'Réglage de la lumière et de la matière.',
  'Presque prêt.',
];

export function GeneratingScreen({ lookName }: { lookName: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Copy advances on a rough schedule; the real signal is the poll in App, not this clock.
  const phase = Math.min(Math.floor(elapsed / 6), GEN_COPY.length - 1);
  // Ease toward 95% so the bar never sits full while the work is still running.
  const pct = Math.min(95, Math.round((1 - Math.exp(-elapsed / 14)) * 100));

  return (
    <section>
      <p className="m-kicker">Étape 04</p>
      <h2 className="m-h">
        On pose ta <em>coupe.</em>
      </h2>
      <p className="m-sub">{GEN_COPY[phase]}</p>

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
      <Note>
        Le calcul continue même si tu fermes cet onglet. Reviens sur cette page connecté et ton essai
        t'attend.
      </Note>
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
const REVEAL_COPY = {
  confirming: {
    head: 'Paiement',
    em: 'accepté.',
    sub: "On attend la confirmation, puis tes essais arrivent sur ton compte. C'est notre serveur qui répond, quelques secondes.",
    pct: 45,
  },
  fetching: {
    head: 'Crédits',
    em: 'reçus.',
    sub: "On sort la version nette de ton image. Elle est déjà calculée, il ne reste qu'à te la donner.",
    pct: 82,
  },
} as const;

export function RevealingScreen({ phase }: { phase: 'confirming' | 'fetching' }) {
  const copy = REVEAL_COPY[phase];
  return (
    <section>
      <p className="m-kicker">Étape 05</p>
      <h2 className="m-h">
        {copy.head} <em>{copy.em}</em>
      </h2>
      <p className="m-sub">{copy.sub}</p>

      <div className="m-prog">
        <i style={{ width: `${copy.pct}%` }} />
      </div>

      {/* La reprise automatique (`resumableGeneration`) rend cette phrase vraie : un résultat payé
          et débloqué se retrouve en revenant sur la page. Ne pas la promettre sans elle. */}
      <Note>
        Ton paiement est enregistré. Même si la page se ferme maintenant, ton résultat t'attend ici.
      </Note>
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

  useEffect(() => {
    void fetchPacks().then((rows) => {
      setPacks(rows);
      setSelected((cur) => cur ?? defaultPackId(rows));
    });
  }, []);

  return (
    <section>
      <p className="m-kicker">Ton essai est prêt</p>
      <h2 className="m-h">
        Il ne reste qu'à <em>le voir.</em>
      </h2>
      <p className="m-sub">
        Ton résultat existe, en pleine définition. Révèle-le, et garde de quoi essayer autant de
        coupes que tu veux.
      </p>

      {/* An empty list here is a TOTAL failure of the money screen, and it failed silently once
          already (the query selected a column the migration had not created yet). Never render an
          empty box: say something is wrong. */}
      {packs?.length === 0 && (
        <Alert>Les offres n'ont pas pu être chargées. Recharge la page, ton résultat t'attend.</Alert>
      )}

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
                  Ton résultat net <em>+ {pack.credits - 1} essais</em>
                  {badge && <span className="m-tag">{badge}</span>}
                </span>
                <span className="sub">{pack.unit} l'essai</span>
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
        {busy ? 'Révélation…' : 'Révéler mon résultat'} <Arrow />
      </button>

      <div className="m-trust">
        <span>Paiement par Paddle</span>
        <span>TVA incluse</span>
        <span>Sans abonnement</span>
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
  // Nothing to point an Android visitor at until the Play listing exists.
  if (os === 'android' && !PLAY_URL) return null;
  const href = os === 'android' ? PLAY_URL : APPSTORE_URL;

  return (
    <div className="m-app">
      <p className="m-app-title">Continue sur l'app</p>
      <p className="m-app-body">
        {credits > 0 ? (
          <>
            Tes <strong>{credits} essais</strong> et tous tes résultats sont sur ton compte. Connecte-toi
            avec la même adresse et tu les retrouves.
          </>
        ) : (
          <>
            Tes résultats sont sur ton compte. Connecte-toi avec la même adresse et tu les retrouves.
          </>
        )}
      </p>
      <a className="m-btn m-btn--ghost" href={href ?? APPSTORE_URL} target="_blank" rel="noopener noreferrer">
        Télécharger Mèche
      </a>
      {/* Un acheteur web n'a JAMAIS de mot de passe : il s'inscrit par code, sans en choisir un.
          Le detour par « Mot de passe oublié » etait le contournement d'avant `(auth)/code.tsx`.
          Maintenant que l'app a son bouton dedie, on le nomme tel quel : une consigne qui ne
          correspond pas au libelle affiche coute plus qu'elle n'aide. Garder ce texte aligne sur
          `signin_code_link` du dictionnaire si le libelle change. */}
      <p className="m-app-fine">
        Si tu t'es connecté avec Google ou Apple, utilise le même bouton dans l'app. Avec ton email,
        choisis « Me connecter avec un code » et saisis le code reçu.
      </p>
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
  return (
    <section>
      <p className="m-kicker">{lookName}</p>
      <h2 className="m-h">
        Voilà <em>toi,</em> en {lookName.toLowerCase()}.
      </h2>
      <p className="m-sub">
        Télécharge-le, montre-le à ton coiffeur, ou relance un essai.
        {credits > 0 && (
          <>
            {' '}
            Il te reste <strong>{credits} essai{credits > 1 ? 's' : ''}</strong>.
          </>
        )}
      </p>

      <div className="m-acts">
        {imageUrl && (
          <a className="m-btn m-btn--primary" href={imageUrl} download={`meche-${lookName}.jpg`}>
            Télécharger
          </a>
        )}
        <button className="m-btn m-btn--ghost" type="button" onClick={onAgain}>
          Essayer un autre look
        </button>
      </div>

      <ContinueInApp credits={credits} />
    </section>
  );
}

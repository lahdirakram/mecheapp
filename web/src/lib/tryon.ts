import { supabase } from './supabase';
import { tr } from './i18n';

export type Brief = {
  prompt?: string;
  lookName?: string;
  length?: number;
  color?: string;
  fringe?: number;
};

/** Error codes `generate` and `unlock` can answer with, mapped to what the UI should do. */
export type TryOnCode =
  | 'no_credits'
  | 'daily_cap'
  | 'rate_limited'
  | 'invalid_image'
  | 'prompt_too_long'
  | 'unknown';

export class TryOnError extends Error {
  code: TryOnCode;
  constructor(code: TryOnCode, message: string) {
    super(message);
    this.code = code;
  }
}

// A FunctionsHttpError hides the real body on `.context` (and, depending on version, `.response`).
// The mobile app learned this the hard way: the no-credits 402 was slipping through to a generic
// catch because only one of the two was read. Read both, and treat a 402 as no_credits even when the
// body is unreadable.
async function decodeError(error: unknown): Promise<TryOnError> {
  const e = error as { context?: unknown; response?: unknown; message?: string };
  const ctx = (e?.context ?? e?.response) as
    | { status?: number; json?: () => Promise<{ error?: string }> }
    | undefined;

  let status = typeof ctx?.status === 'number' ? ctx.status : undefined;
  let code: string | undefined;
  try {
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json();
      code = body?.error;
    }
  } catch {
    /* body may be unreadable — status still tells us enough */
  }

  if (code === 'no_credits' || status === 402) {
    return new TryOnError('no_credits', tr().tryon.needCredit);
  }
  if (code === 'daily_cap' || status === 503) {
    return new TryOnError('daily_cap', tr().tryon.dailyCap);
  }
  if (code === 'rate_limited' || status === 429) {
    return new TryOnError('rate_limited', tr().tryon.rateLimited);
  }
  if (code === 'invalid_image') {
    return new TryOnError('invalid_image', tr().tryon.invalidImage);
  }
  if (code === 'prompt_too_long') {
    return new TryOnError('prompt_too_long', tr().tryon.promptTooLong);
  }
  // Never surface a raw code to a visitor.
  console.warn('[tryon] unhandled error', { status, code });
  return new TryOnError('unknown', tr().tryon.launchFailed);
}

export type Enqueued = { id: string; lookId?: string };

/**
 * Start a try-on. Returns as soon as the server has reserved the credit and recorded a pending row;
 * the AI itself finishes in the background, so the visitor can close the tab.
 *
 * `supportsLocked: true` is what makes the whole web funnel work: it tells `generate` this client can
 * render a blurred teaser, so the first try is delivered locked (clear image held in the `vault`
 * bucket) instead of clear. Removing it would hand the result away for free.
 */
export async function startTryOn(input: {
  selfieBase64: string;
  mimeType: string;
  brief: Brief;
  name: string;
}): Promise<Enqueued> {
  const { data, error } = await supabase.functions.invoke('generate', {
    body: { ...input, supportsLocked: true },
  });
  if (error) throw await decodeError(error);
  return { id: String(data.id), lookId: data.lookId ? String(data.lookId) : undefined };
}

export type GenerationRow = {
  id: string;
  status: 'pending' | 'done' | 'failed';
  locked: boolean;
  result_path: string | null;
  thumb_path: string | null;
  error: string | null;
};

/** One read of the generation row. RLS scopes it to the caller, so no ownership check is needed. */
export async function readGeneration(id: string): Promise<GenerationRow | null> {
  const { data, error } = await supabase
    .from('generations')
    .select('id, status, locked, result_path, thumb_path, error')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new TryOnError('unknown', tr().tryon.stateUnreadable);
  return (data as GenerationRow | null) ?? null;
}

const POLL_MS = 1500;
/** Give up watching after 3 minutes. The row keeps its own life server-side either way. */
const POLL_TIMEOUT_MS = 180_000;

/** Watch a generation until it leaves `pending`. Aborting only stops watching, never the work. */
export async function waitForGeneration(id: string, signal?: AbortSignal): Promise<GenerationRow> {
  const startedAt = Date.now();
  for (;;) {
    if (signal?.aborted) throw new TryOnError('unknown', tr().tryon.watchAborted);
    await new Promise((r) => setTimeout(r, POLL_MS));
    if (signal?.aborted) throw new TryOnError('unknown', tr().tryon.watchAborted);

    const row = await readGeneration(id);
    if (row && row.status !== 'pending') return row;

    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      // No email exists on web (`generate` only pushes to Expo device tokens), so this copy must
      // never promise one: coming back to the page is the real recovery path (resumableGeneration).
      throw new TryOnError('unknown', tr().tryon.takingLong);
    }
  }
}

export type ResumableGeneration = GenerationRow & { brief: Brief | null; created_at: string };

/**
 * The visitor's most recent try-on, so returning to the page picks up where they left off.
 *
 * This exists because there is NO completion notification on web. `generate` only pushes to Expo
 * device tokens, and a browser has no row in `devices`, so nothing is ever sent. Coming back to this
 * page is therefore the only way to find a finished result, which makes it a feature, not a nicety.
 *
 * Windows differ by what is at stake:
 *  - done but locked (unpaid): 24 h. There is money on the table.
 *  - done and already clear: 2 h. Long enough that closing the tab and coming back returns you to
 *    your result, short enough that tomorrow's visit starts fresh instead of reopening old work.
 *  - still running: 15 min. A `pending` row cannot legitimately be older than that, because the
 *    0031 cron reaps anything stuck past 10 minutes into `failed`. A longer window would just mean
 *    polling a row that is about to be declared dead.
 *  - failed: 1 h, and ONLY to explain it. A reaped or failed try-on that simply vanished on return
 *    is the same silent disappearance the email copy was rightly called out for.
 *
 * The finished-and-clear case was initially excluded as "history". That was wrong: from the
 * visitor's side they made a try-on, came back, and it had disappeared.
 */
const RESUME_PENDING_MS = 15 * 60_000;
const RESUME_LOCKED_MS = 24 * 3600_000;
const RESUME_FINISHED_MS = 2 * 3600_000;
const RESUME_FAILED_MS = 3600_000;

export async function resumableGeneration(): Promise<ResumableGeneration | null> {
  const { data, error } = await supabase
    .from('generations')
    .select('id, status, locked, result_path, thumb_path, error, brief, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as ResumableGeneration;
  const age = Date.now() - new Date(row.created_at).getTime();

  if (row.status === 'pending') return age < RESUME_PENDING_MS ? row : null;
  if (row.status === 'failed') return age < RESUME_FAILED_MS ? row : null;
  if (!row.result_path) return null; // done but nothing to show
  if (row.locked) return age < RESUME_LOCKED_MS ? row : null;
  return age < RESUME_FINISHED_MS ? row : null;
}

/** Visitor-facing explanation for a failed row. Never shows the raw server string. */
export function failureMessage(row: Pick<GenerationRow, 'error'>): string {
  const err = row.error ?? '';
  if (err.includes('no_credits')) return tr().tryon.failedNoCredits;
  // 0031: the worker died mid-generation. The credit was refunded with it.
  if (err.startsWith('reaped')) return tr().tryon.failedReaped;
  return tr().tryon.failedKept;
}

/** Signed URL for a private result image. `generated` holds the teaser while a row is locked. */
export async function signedResultUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('generated').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/**
 * Reveal a locked result: charges 1 credit and moves the clear image out of the `vault`.
 * Idempotent server-side, so a retry after a flaky response is safe.
 */
export async function unlockGeneration(generationId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('unlock', { body: { generationId } });
  if (error) throw await decodeError(error);
}

/** Current balance. Cheap pre-flight so an out-of-credits visitor never waits on a doomed call. */
export async function creditBalance(): Promise<number> {
  const { data } = await supabase.rpc('my_credit_balance');
  return typeof data === 'number' ? data : 0;
}

/**
 * Wait for credits to actually appear after a payment.
 *
 * The browser's `checkout.completed` says the visitor finished paying; it does NOT say the credits
 * exist. Only `paddle-webhook` grants them, and that is a separate server-to-server call that may
 * land a moment later. Revealing on the browser event alone would mean revealing before the grant
 * is real, so we poll the ledger and let the server be the source of truth.
 */
export async function waitForCredits(timeoutMs = 90_000): Promise<number> {
  const startedAt = Date.now();
  for (;;) {
    const balance = await creditBalance();
    if (balance > 0) return balance;
    if (Date.now() - startedAt > timeoutMs) {
      throw new TryOnError('unknown', tr().tryon.creditsSlow);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

import { initializePaddle, type Paddle } from '@paddle/paddle-js';
import { PADDLE_ENV, PADDLE_READY, PADDLE_TOKEN } from './config';

/**
 * Paddle overlay checkout.
 *
 * The client's ONLY job is to take the money. It never grants anything: credits arrive through
 * `paddle-webhook`, server-side, and the UI waits for the balance to actually move before revealing.
 * A `checkout.completed` event in the browser is a hint that payment happened, not proof, and
 * certainly not authorisation.
 */

let paddlePromise: Promise<Paddle | undefined> | null = null;
/** Resolved when the overlay reports a completed checkout. Replaced on each open(). */
let completedResolver: (() => void) | null = null;

function paddle(): Promise<Paddle | undefined> {
  if (!PADDLE_READY) return Promise.resolve(undefined);
  paddlePromise ??= initializePaddle({
    environment: PADDLE_ENV,
    token: PADDLE_TOKEN,
    eventCallback: (event) => {
      if (event.name === 'checkout.completed') {
        completedResolver?.();
        completedResolver = null;
      }
    },
  }).catch((e) => {
    console.warn('[paddle] init failed', e);
    // Reset so a transient failure (blocked script, offline) can be retried on the next click.
    paddlePromise = null;
    return undefined;
  });
  return paddlePromise;
}

export class PaddleError extends Error {}

/**
 * Open the checkout and resolve once the visitor completes payment.
 *
 * `customData.user_id` is what lets the webhook map the payment to an account. Without it the grant
 * is impossible and the webhook drops the event as unmappable, so it is not optional.
 */
export async function checkout(opts: {
  priceId: string;
  userId: string;
  email?: string;
  /** Aborts the wait (not the payment) if the visitor walks away. */
  signal?: AbortSignal;
}): Promise<void> {
  const p = await paddle();
  if (!p) throw new PaddleError('Le paiement est indisponible pour le moment.');

  const completed = new Promise<void>((resolve, reject) => {
    completedResolver = resolve;
    opts.signal?.addEventListener('abort', () => reject(new PaddleError('Paiement interrompu.')), { once: true });
  });

  p.Checkout.open({
    items: [{ priceId: opts.priceId, quantity: 1 }],
    ...(opts.email ? { customer: { email: opts.email } } : {}),
    customData: { user_id: opts.userId },
    settings: {
      displayMode: 'overlay',
      theme: 'light',
      locale: 'fr',
      // No successUrl on purpose: staying on the page is what lets us wait for the webhook and
      // reveal in place. A redirect would drop the visitor back into a cold page load.
    },
  });

  await completed;

  // Paddle leaves the overlay up after a successful payment — it has no idea we are about to reveal
  // the result underneath it, so without this the visitor stares at a spent checkout and has to
  // dismiss it by hand at the exact moment we want their attention on the photo.
  try {
    p.Checkout.close();
  } catch {
    /* already dismissed by the visitor */
  }
}

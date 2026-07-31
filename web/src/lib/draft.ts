// Survives the OAuth round trip.
//
// Signing in with Google or Apple NAVIGATES AWAY from this page and comes back. Everything held in
// React state dies with it, including the prepared selfie, so without this the visitor returns
// signed in and is asked for their photo again. That is the moment they leave.
//
// Why IndexedDB and not sessionStorage: a 1600px JPEG is roughly 400 KB to 1 MB. Web Storage only
// holds strings, so it would have to be base64 (a third bigger again) and is stored as UTF-16, which
// doubles it in bytes against a quota that is commonly ~5 MB. IndexedDB stores the Blob natively,
// with no encoding tax and no realistic size ceiling.
//
// It also fixes a problem OAuth did not cause: a phone that reloads the tab mid-funnel no longer
// loses the photo.
//
// PRIVACY: this is a face photo sitting on the visitor's disk. It is written only when we are about
// to leave the page, cleared the moment the server has the image (the try-on is enqueued), and
// discarded on read if older than TTL. Nothing here outlives the try-on it belongs to.

const DB_NAME = 'meche-studio';
const STORE = 'draft';
const KEY = 'current';
const TTL_MS = 60 * 60 * 1000; // 1 h

export type Draft = {
  /** The already-prepared (downscaled) JPEG. Never the original camera file. */
  blob: Blob;
  lookName?: string;
  lookPrompt?: string;
  savedAt: number;
};

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

/**
 * Persist the in-flight try-on. Best effort on purpose: private browsing and storage pressure can
 * both refuse the write, and losing a draft must never break the funnel that is still on screen.
 */
export async function saveDraft(draft: Omit<Draft, 'savedAt'>): Promise<void> {
  try {
    await tx('readwrite', (s) => s.put({ ...draft, savedAt: Date.now() }, KEY));
  } catch (e) {
    console.warn('[draft] not saved', e);
  }
}

/** Read a draft back, discarding anything stale. Returns null when there is nothing usable. */
export async function loadDraft(): Promise<Draft | null> {
  try {
    const draft = (await tx<Draft | undefined>('readonly', (s) => s.get(KEY))) ?? null;
    if (!draft) return null;
    if (Date.now() - draft.savedAt > TTL_MS || !(draft.blob instanceof Blob)) {
      await clearDraft();
      return null;
    }
    return draft;
  } catch (e) {
    console.warn('[draft] not read', e);
    return null;
  }
}

/** Erase the stored photo. Call as soon as the server holds the image. */
export async function clearDraft(): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(KEY));
  } catch {
    /* nothing to clean up we can do anything about */
  }
}

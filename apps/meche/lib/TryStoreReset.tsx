import { useEffect, useRef } from 'react';
import { useSession } from '@meche/api-client';
import { useTryStore } from './tryStore';

// Clears the in-progress try-on whenever the signed-in user CHANGES (logout / account switch), so a
// previous account's selfie/result/brief never leaks into a new session's flow (e.g. showing the old
// account's photo in the loader). Token refreshes keep the same user id → no reset.
export function TryStoreReset() {
  const session = useSession();
  const uid = session?.user.id ?? null;
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prev.current !== undefined && prev.current !== uid) {
      useTryStore.getState().reset();
    }
    prev.current = uid;
  }, [uid]);
  return null;
}

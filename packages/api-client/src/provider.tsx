import React from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

interface SupabaseCtx {
  client: SupabaseClient;
  session: Session | null;
  /** True until the initial session has been resolved from storage. */
  loading: boolean;
}

const Ctx = React.createContext<SupabaseCtx | null>(null);

/**
 * Holds the Supabase client + live auth session. Each app creates the client (with its
 * AsyncStorage adapter) and wraps the tree once. Subscribes to auth state changes.
 */
export function SupabaseProvider({
  client,
  children,
}: {
  client: SupabaseClient;
  children: React.ReactNode;
}) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  const value = React.useMemo(() => ({ client, session, loading }), [client, session, loading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useCtx(): SupabaseCtx {
  const v = React.useContext(Ctx);
  if (!v) throw new Error('useSupabase must be used within <SupabaseProvider>');
  return v;
}

export function useSupabase(): SupabaseClient {
  return useCtx().client;
}

export function useSession(): Session | null {
  return useCtx().session;
}

export function useAuthLoading(): boolean {
  return useCtx().loading;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Lightweight consumer auth for the Clove Dining microsite. Intentionally
 * separate from the partner/admin `AuthContext` so role lookups and the
 * dashboard's restaurant scoping are untouched here.
 */
type CloveAuthContextValue = {
  session: Session | null;
  loading: boolean;
  email: string | null;
  displayName: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const CloveAuthContext = createContext<CloveAuthContextValue | null>(null);

export function CloveAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {});
  }, []);

  const email = session?.user?.email ?? null;
  const displayName =
    (session?.user?.user_metadata?.full_name as string | undefined) ??
    (session?.user?.user_metadata?.name as string | undefined) ??
    null;

  const value = useMemo<CloveAuthContextValue>(
    () => ({ session, loading, email, displayName, signIn, signOut }),
    [session, loading, email, displayName, signIn, signOut],
  );

  return <CloveAuthContext.Provider value={value}>{children}</CloveAuthContext.Provider>;
}

export function useCloveAuth(): CloveAuthContextValue {
  const ctx = useContext(CloveAuthContext);
  if (!ctx) throw new Error("useCloveAuth must be used within CloveAuthProvider");
  return ctx;
}

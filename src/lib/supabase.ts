import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

/** True when real project credentials are present (see `main.tsx` BootDiagnostics for user-facing UI). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  console.error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (local) or your host.",
  );
} else {
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      console.error("VITE_SUPABASE_URL must use http or https.");
    }
  } catch {
    console.error("VITE_SUPABASE_URL is not a valid URL.");
  }
}

// Never throw at import time: AuthContext imports this module before React can
// render BootDiagnostics - a throw here yields a blank white page in dev.
const resolvedUrl = supabaseUrl || "https://placeholder.supabase.co";
const resolvedKey =
  supabaseKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

/**
 * Supabase Kong returns 403 `No API key found in request` if the `apikey`
 * header is missing. Some environments (mis-merged fetch options, strict
 * proxies) can drop it - always inject the anon key on every request.
 */
function fetchWithApikey(anonKey: string): typeof fetch {
  return (input, init) => {
    if (!anonKey) {
      return fetch(input, init);
    }
    const base =
      init?.headers ??
      (typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined);
    const h = new Headers(base);
    if (!h.has("apikey")) {
      h.set("apikey", anonKey);
    }
    return fetch(input, { ...init, headers: h });
  };
}

export const supabase = createClient(resolvedUrl, resolvedKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Required for the email-link / Stripe redirect flows to pick up the access
    // token from the URL hash on the JoinBridge / VerifyEmail pages.
    detectSessionInUrl: true,
    flowType: "pkce",
  },
  global: {
    fetch: fetchWithApikey(resolvedKey),
    headers: { apikey: resolvedKey },
  },
});

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

/** True when real project credentials are present (see `main.tsx` BootDiagnostics for user-facing UI). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  console.error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (local) or your host.",
  );
} else if (supabaseUrl) {
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
// render BootDiagnostics — a throw here yields a blank white page in dev.
const resolvedUrl = supabaseUrl || "https://placeholder.supabase.co";
const resolvedKey = supabaseKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

export const supabase = createClient(resolvedUrl, resolvedKey);

import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and Anon Key from your dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment environment.",
  );
}

// Keep app booting even when env vars are missing; requests will fail with clear console errors
// until deployment variables are configured.
export const supabase = createClient(
  supabaseUrl || "https://invalid.supabase.local",
  supabaseKey || "invalid-anon-key",
);

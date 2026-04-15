import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment environment.",
  );
}

if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      console.error("VITE_SUPABASE_URL must use http or https.");
    }
  } catch {
    console.error("VITE_SUPABASE_URL is not a valid URL.");
  }
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY). " +
    "The app cannot start without them. Check your .env file or deployment config."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

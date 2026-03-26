import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and Anon Key from your dashboard
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

// Keep app booting even when env vars are missing; requests will fail with clear console errors
// until deployment variables are configured.
export const supabase = createClient(
  supabaseUrl || "https://example.com",
  supabaseKey ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MCwiZXhwIjo0MTAyNDQ0NDgwMH0.placeholder",
);

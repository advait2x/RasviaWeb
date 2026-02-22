import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and Anon Key from your dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials");
  console.log("URL:", supabaseUrl);
  console.log("KEY:", supabaseAnonKey);
  throw new Error("Supabase URL or Anon Key missing. Check your .env file.");
}

// Debug: confirm env vars are available at runtime (safe: show presence and masked prefix only)
try {
  console.log('[lib/supabaseClient] SUPABASE_URL present?', !!supabaseUrl);
  console.log('[lib/supabaseClient] SUPABASE_ANON_KEY present?', !!supabaseAnonKey, 'prefix=', supabaseAnonKey ? `${String(supabaseAnonKey).slice(0,6)}...` : null);
} catch (e) {
  // no-op
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

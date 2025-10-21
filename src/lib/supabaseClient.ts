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

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

// Load environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// --- Debug: Confirm env vars at runtime ---
if (typeof window !== "undefined") {
  console.log("[supabase/client] Platform:", Capacitor.getPlatform());
  console.log("[supabase/client] SUPABASE_URL present?", !!SUPABASE_URL);
  console.log(
    "[supabase/client] SUPABASE_ANON_KEY present?",
    !!SUPABASE_ANON_KEY,
    "prefix=",
    SUPABASE_ANON_KEY ? `${String(SUPABASE_ANON_KEY).slice(0, 6)}...` : null
  );
}

// 🔐 Capacitor Storage Adapter
const capacitorStorage = {
  getItem: async (key: string) => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string) => {
    await Preferences.remove({ key });
  },
};

// 🧭 Detect platform
const isNativePlatform = Capacitor.getPlatform() !== "web";

// 🪝 Ensure env vars are set
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "[supabase/client] ❌ Missing Supabase env variables. Check your .env file."
  );
}

// 🧠 Create Supabase client
export const supabase = createClient<Database>(
  SUPABASE_URL!,
  SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: isNativePlatform ? capacitorStorage : undefined,
      persistSession: true,        // ✅ Keep user signed in after refresh
      autoRefreshToken: true,      // ✅ Refresh JWT automatically
      detectSessionInUrl: true,    // ✅ For OAuth callback URLs
      flowType: "pkce",            // ✅ More secure than implicit flow
    },
  }
);

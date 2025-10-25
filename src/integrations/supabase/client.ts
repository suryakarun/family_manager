import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { Preferences } from '@capacitor/preferences';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: confirm env vars are available at runtime (don't print full keys)
try {
  // eslint-disable-next-line no-console
  console.log('[supabase/client] SUPABASE_URL present?', !!SUPABASE_URL);
  // eslint-disable-next-line no-console
  console.log('[supabase/client] SUPABASE_ANON_KEY present?', !!SUPABASE_ANON_KEY, 'prefix=', SUPABASE_ANON_KEY ? `${String(SUPABASE_ANON_KEY).slice(0,6)}...` : null);
} catch (e) {
  // ignore in non-browser environments
}

// Custom storage adapter for Capacitor
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

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: capacitorStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  }
});
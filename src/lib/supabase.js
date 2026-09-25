// Supabase client for the app. Reads only — every write goes through the
// `ask` Edge Function. Each device signs in anonymously so RLS can scope
// requests/beats (and their Realtime stream) to their owner.
//
// Configure in .env:
//   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
// Both are public by design (RLS protects the data). Without them the app
// still runs; asked questions just stay as local placeholders.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const backendConfigured = Boolean(url && key);

export const supabase = backendConfigured
  ? createClient(url, key, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// A session for this device — created once, then reused from storage.
let pending = null;
export function ensureSession() {
  if (!supabase) return Promise.resolve(null);
  if (!pending) {
    pending = (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session;
      const { data: signed, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      return signed.session;
    })().catch((e) => {
      pending = null;
      throw e;
    });
  }
  return pending;
}

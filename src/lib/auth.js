// Google sign-in, backed by Supabase Auth. Signing in is required to make
// briefings (asking, +, topic chips); watching never needs an account.
//
//   useSession()        the current Supabase session (null when signed out),
//                       kept live across sign-in, sign-out and token refresh
//   signInWithGoogle()  native Google sheet on iOS/Android, redirect on web
//                       (see googleSignIn.native.js / googleSignIn.web.js)
//   signOut()
//   getAccessToken()    the JWT the pipeline server verifies on /ask
import { useEffect, useState } from 'react';

import { supabase } from './supabase';
import { googleSignIn, googleSignOut } from './googleSignIn';

// On once both halves exist: the Supabase project and Google's OAuth client.
// Until then nothing is gated, so the app keeps working mid-setup.
export const authConfigured = Boolean(supabase && process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

export function useSession() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(!supabase);
  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next ?? null));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return { session, ready };
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Sign-in isn’t set up for this version yet.');
  return googleSignIn(supabase);
}

export async function signOut() {
  await googleSignOut().catch(() => {});
  await supabase?.auth.signOut();
}

export async function getAccessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

// First name (or email) for the account chip.
export const displayName = (session) =>
  session?.user?.user_metadata?.full_name?.split(' ')[0] || session?.user?.email || 'Account';

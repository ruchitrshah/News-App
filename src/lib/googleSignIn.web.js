// Google sign-in on the web: Supabase sends the browser to Google and back
// to this page, where the Supabase client picks the session up from the URL
// (detectSessionInUrl in lib/supabase.js). Nothing to configure here beyond
// the Google provider in the Supabase dashboard and this site in its
// allowed redirect URLs.
export async function googleSignIn(supabase) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  return null; // the page navigates away; the session arrives on return
}

export async function googleSignOut() {}

// Google sign-in on iOS/Android: Google's native account sheet returns an
// ID token, which Supabase exchanges for a session (signInWithIdToken).
//
// Needs a development or TestFlight build — the native module isn't in Expo
// Go — plus both OAuth client IDs in the environment:
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID  (Supabase verifies tokens against it)
//   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID  (the iOS app's own client)
let Google = null;
try {
  Google = require('@react-native-google-signin/google-signin');
} catch {
  Google = null;
}

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
let configured = false;

export async function googleSignIn(supabase) {
  if (!Google?.GoogleSignin) throw new Error('Google sign-in needs the Genie app from TestFlight (it isn’t available in Expo Go).');
  if (!WEB_CLIENT_ID || !IOS_CLIENT_ID) throw new Error('Google sign-in isn’t set up for this version yet.');
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = Google;
  if (!configured) {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, iosClientId: IOS_CLIENT_ID });
    configured = true;
  }
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null; // the user closed the sheet
    const token = response.data.idToken;
    if (!token) throw new Error('Google didn’t return an ID token.');
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
    if (error) throw error;
    return data.session;
  } catch (e) {
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return null;
    throw e;
  }
}

export async function googleSignOut() {
  if (Google?.GoogleSignin && configured) await Google.GoogleSignin.signOut();
}

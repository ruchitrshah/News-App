// Extends app.json with settings that depend on environment values.
//
// Google Sign-In on iOS needs the iOS OAuth client ID's reversed form as a
// URL scheme, baked in at build time. It's added only when
// EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set, so builds keep working before
// Google Sign-In is configured (the sign-in button then explains why it's off).
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!iosClientId) return config;
  const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.replace(/\.apps\.googleusercontent\.com$/, '')}`;
  return {
    ...config,
    plugins: [...(config.plugins || []), ['@react-native-google-signin/google-signin', { iosUrlScheme }]],
  };
};

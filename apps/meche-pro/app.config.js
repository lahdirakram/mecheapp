// Dynamic Expo config. Base = app.json (production). When APP_ENV=staging (set per EAS profile in
// eas.json), we ship a SEPARATE app identity — distinct bundle id + name — so the staging build
// installs ALONGSIDE prod on the same device. Backend selection stays driven by EXPO_PUBLIC_* (also
// per profile in eas.json). Same pattern as apps/meche.
const base = require('./app.json').expo;

module.exports = () => {
  // Deep clone so overrides never mutate the shared base object.
  const expo = JSON.parse(JSON.stringify(base));

  if (process.env.APP_ENV === 'staging') {
    expo.name = 'Mèche Pro (staging)';
    expo.scheme = 'mechepro-staging';
    expo.ios = { ...expo.ios, bundleIdentifier: 'com.mechepro.app.staging' };
    expo.android = { ...expo.android, package: 'com.mechepro.app.staging' };
  }

  // Google Sign-In needs a per-bundle-id iOS OAuth client. The plugin is only added once the
  // reversed iOS client id exists (set per profile in eas.json); until then builds ship without
  // Google and the app hides the button (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID also unset).
  const GOOGLE_IOS_REVERSED = process.env.GOOGLE_IOS_REVERSED_CLIENT_ID;
  if (GOOGLE_IOS_REVERSED) {
    expo.plugins = [...expo.plugins, ['@react-native-google-signin/google-signin', { iosUrlScheme: GOOGLE_IOS_REVERSED }]];
  }

  return { expo };
};

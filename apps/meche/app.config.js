// Dynamic Expo config. Base = app.json (production). When APP_ENV=staging (set per EAS profile in
// eas.json), we ship a SEPARATE app identity — distinct bundle id + name — so the staging build
// installs ALONGSIDE prod on the same device. Backend selection stays driven by EXPO_PUBLIC_* (also
// per profile in eas.json).
const base = require('./app.json').expo;

module.exports = () => {
  // Deep clone so overrides never mutate the shared base object.
  const expo = JSON.parse(JSON.stringify(base));

  if (process.env.APP_ENV === 'staging') {
    expo.name = 'Mèche (staging)';
    expo.scheme = 'meche-staging';
    expo.ios = { ...expo.ios, bundleIdentifier: 'com.meche.app.staging' };
    expo.android = { ...expo.android, package: 'com.meche.app.staging' };
    // TODO (staging consoles): once a `com.meche.app.staging` app exists in the staging Firebase
    // project, set expo.android.googleServicesFile to its file (push won't work until then). Google
    // Sign-in also needs a staging iOS/Web OAuth client (update the google-signin iosUrlScheme +
    // EXPO_PUBLIC_GOOGLE_* in the preview profile). Email auth + generation work without this.
  }

  return { expo };
};

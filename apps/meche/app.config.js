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
    expo.android = {
      ...expo.android,
      package: 'com.meche.app.staging',
      googleServicesFile: './google-services.staging.json', // staging Firebase app (com.meche.app.staging)
    };
    // Google Sign-in: override the iOS URL scheme with the STAGING reversed iOS client id once the
    // staging OAuth client exists (see GOOGLE_STAGING_IOS_REVERSED below). EXPO_PUBLIC_GOOGLE_* are
    // set to the staging client ids in eas.json (preview/development).
    const GOOGLE_STAGING_IOS_REVERSED = process.env.GOOGLE_STAGING_IOS_REVERSED;
    if (GOOGLE_STAGING_IOS_REVERSED) {
      expo.plugins = expo.plugins.map((p) =>
        Array.isArray(p) && p[0] === '@react-native-google-signin/google-signin'
          ? [p[0], { ...p[1], iosUrlScheme: GOOGLE_STAGING_IOS_REVERSED }]
          : p,
      );
    }
  }

  return { expo };
};

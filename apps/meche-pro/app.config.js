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

  return { expo };
};

// Google Consent Mode v2 DEFAULTS, read by Firebase Analytics before any JS runs. Ad signals
// (ad_storage / ad_user_data / ad_personalization) start DENIED so the app fails closed: a crash,
// a slow launch or a never-answered consent card sends no ad signal to Google. lib/marketing.ts
// flips them via setConsent() once the user accepts. analytics_storage stays on (our own audience
// measurement, not an ad-platform handoff). Required for Google Ads app campaigns in the EEA:
// without granted ad_user_data/ad_personalization, EEA conversions can't feed personalized ads.
const { withAndroidManifest, withInfoPlist, AndroidConfig } = require('@expo/config-plugins');

const DEFAULTS = {
  analytics_storage: true,
  ad_storage: false,
  ad_user_data: false,
  ad_personalization_signals: false,
};

function withAndroid(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app['meta-data'] = app['meta-data'] || [];
    for (const [key, allowed] of Object.entries(DEFAULTS)) {
      const name = `google_analytics_default_allow_${key}`;
      app['meta-data'] = app['meta-data'].filter((m) => m?.$?.['android:name'] !== name);
      // tools:replace is REQUIRED: react-native-firebase_analytics's own AndroidManifest ships
      // these meta-data at `true`, and the merger errors on the value conflict without it
      // (seen on the 2026-08-01 EAS build).
      app['meta-data'].push({
        $: { 'android:name': name, 'android:value': String(allowed), 'tools:replace': 'android:value' },
      });
    }
    return cfg;
  });
}

function withIos(config) {
  return withInfoPlist(config, (cfg) => {
    for (const [key, allowed] of Object.entries(DEFAULTS)) {
      cfg.modResults[`GOOGLE_ANALYTICS_DEFAULT_ALLOW_${key.toUpperCase()}`] = allowed;
    }
    return cfg;
  });
}

module.exports = function withAnalyticsConsentDefaults(config) {
  return withIos(withAndroid(config));
};

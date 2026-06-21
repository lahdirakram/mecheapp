// Strip Android permissions Mèche never uses but that libraries / RN inject into the merged
// manifest: RECORD_AUDIO (no audio capture), SYSTEM_ALERT_WINDOW (no draw-over-apps) and DUMP
// (diagnostics). Uses the `tools:node="remove"` merger directive so a library-contributed
// permission is dropped from the FINAL merged manifest. iOS mic is handled by expo-camera's
// `microphonePermission: false`; the withInfoPlist delete here is a belt-and-suspenders fallback.
const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

const REMOVE = [
  'android.permission.RECORD_AUDIO',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.DUMP',
];

function withAndroid(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    for (const name of REMOVE) {
      manifest['uses-permission'] = manifest['uses-permission'].filter((p) => p?.$?.['android:name'] !== name);
      manifest['uses-permission'].push({ $: { 'android:name': name, 'tools:node': 'remove' } });
    }
    return cfg;
  });
}

function withIos(config) {
  return withInfoPlist(config, (cfg) => {
    delete cfg.modResults.NSMicrophoneUsageDescription;
    return cfg;
  });
}

module.exports = function withTrimmedAndroidPermissions(config) {
  return withIos(withAndroid(config));
};

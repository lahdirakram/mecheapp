// Mèche never records audio — it only takes a still selfie. expo-camera adds RECORD_AUDIO
// (Android) and NSMicrophoneUsageDescription (iOS) to the merged manifest/plist by default, which
// trips store reviews ("why does a photo app want the mic?"). Strip both from the FINAL build.
const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

const MIC = 'android.permission.RECORD_AUDIO';

function withAndroid(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';
    manifest['uses-permission'] = (manifest['uses-permission'] || []).filter((p) => p?.$?.['android:name'] !== MIC);
    // Merger directive so a library-contributed RECORD_AUDIO is removed from the merged manifest too.
    manifest['uses-permission'].push({ $: { 'android:name': MIC, 'tools:node': 'remove' } });
    return cfg;
  });
}

function withIos(config) {
  return withInfoPlist(config, (cfg) => {
    delete cfg.modResults.NSMicrophoneUsageDescription;
    return cfg;
  });
}

module.exports = function withNoMicrophone(config) {
  return withIos(withAndroid(config));
};

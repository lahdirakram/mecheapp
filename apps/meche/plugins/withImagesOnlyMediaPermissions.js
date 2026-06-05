// Mèche only uses IMAGES (save generated looks, pick a photo). expo-media-library /
// expo-image-picker declare the full Android 13+ granular media set by default, including
// READ_MEDIA_VIDEO and READ_MEDIA_AUDIO. Strip those so the manifest (and the Play "data safety"
// section) only advertises photo access. Keeps READ_MEDIA_IMAGES + READ_MEDIA_VISUAL_USER_SELECTED.
const { withAndroidManifest } = require('@expo/config-plugins');

const REMOVE = ['android.permission.READ_MEDIA_VIDEO', 'android.permission.READ_MEDIA_AUDIO'];

module.exports = function withImagesOnlyMediaPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';
    manifest['uses-permission'] = manifest['uses-permission'] || [];

    for (const name of REMOVE) {
      // Drop any direct declaration, then add a merger "remove" directive so a permission
      // contributed by a library manifest is stripped from the final merged manifest too.
      manifest['uses-permission'] = manifest['uses-permission'].filter((p) => p?.$?.['android:name'] !== name);
      manifest['uses-permission'].push({ $: { 'android:name': name, 'tools:node': 'remove' } });
    }
    return cfg;
  });
};

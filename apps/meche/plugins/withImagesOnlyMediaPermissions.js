// Mèche never reads the media library: picking goes through the system Photo Picker
// (no permission) and saving uses writeOnly MediaLibrary access (no permission on 13+,
// WRITE_EXTERNAL_STORAGE on ≤12). expo-media-library's config plugin still injects the
// Android 13+ granular read set (READ_MEDIA_IMAGES/VIDEO/AUDIO + VISUAL_USER_SELECTED)
// by default. Strip it all so the manifest never triggers Google Play's photo/video
// permissions declaration.
const { withAndroidManifest } = require('@expo/config-plugins');

const REMOVE = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
];

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

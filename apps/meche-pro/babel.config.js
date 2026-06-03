module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Must be listed last. Reanimated 4 ships its Babel plugin via react-native-worklets.
    plugins: ['react-native-worklets/plugin'],
  };
};

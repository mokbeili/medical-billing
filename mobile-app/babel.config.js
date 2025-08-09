module.exports = {
  presets: ["babel-preset-expo"],
  plugins: [
    ["react-native-worklets-core/plugin"],
    // Reanimated plugin MUST be last
    "react-native-reanimated/plugin",
  ],
};

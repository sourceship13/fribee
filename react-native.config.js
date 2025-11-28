module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: [
    './assets/fonts/',
    './node_modules/react-native-vector-icons/Fonts/',
  ],
  dependencies: {
    'react-native-config': {
      platforms: {
        android: null, // Disable autolinking for Android to avoid New Architecture issues
      },
    },
  },
};
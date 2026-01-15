module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts/', './assets/imgs/'],
  dependencies: {
    'react-native-config': {
      platforms: {
        android: null, // Disable autolinking for Android to avoid New Architecture issues
      },
    },
  },
  // Exclude license and readme files to prevent duplicates
  plugins: [
    [
      'module-resolver',
      {
        extensions: ['.ios.js', '.android.js', '.js', '.json'],
      },
    ],
  ],
};

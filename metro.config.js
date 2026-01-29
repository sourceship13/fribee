const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const { withSentryConfig } = require('@sentry/react-native/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

// Add the local react-native-share-sms module to watchFolders
const localShareSmsPath = path.resolve(__dirname, '../react-native-share-sms');

const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    // Enable symlink resolution
    resolveRequest: null,
  },
  watchFolders: [
    localShareSmsPath,
  ],
};

module.exports = withSentryConfig(mergeConfig(defaultConfig, config));

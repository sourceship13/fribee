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

// Path to the local react-native-share-sms package
const shareSmsPath = path.resolve(__dirname, '../react-native-share-sms');

const config = {
  watchFolders: [shareSmsPath],
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    // Ensure node_modules resolution includes the symlinked package's dependencies
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(shareSmsPath, 'node_modules'),
    ],
  },
};

module.exports = withSentryConfig(
  mergeConfig(defaultConfig, config),
);

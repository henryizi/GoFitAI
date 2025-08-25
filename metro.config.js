const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configure for react-native-svg
const { resolver: { sourceExts, assetExts } } = getDefaultConfig(__dirname);
config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer");
config.resolver.assetExts = assetExts.filter(ext => ext !== "svg");
config.resolver.sourceExts = [...sourceExts, "svg", "cjs"];

// Add path aliases to Metro resolver
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@/components': path.resolve(__dirname, 'src/components'),
  '@/hooks': path.resolve(__dirname, 'src/hooks'),
  '@/services': path.resolve(__dirname, 'src/services'),
  '@/types': path.resolve(__dirname, 'src/types'),
  '@/utils': path.resolve(__dirname, 'src/utils'),
  '@/store': path.resolve(__dirname, 'src/store'),
  '@/styles': path.resolve(__dirname, 'src/styles'),
  tslib: require.resolve('tslib/tslib.js'),
};

// Fix for react-native-svg web bundling issue
config.resolver.platforms = ['ios', 'android', 'web'];
// Prefer native, then main, then browser to avoid pulling web bundles on native
config.resolver.mainFields = ['react-native', 'main', 'browser'];
// Force Metro to ignore package "exports" maps so tslib resolves to CommonJS entry
config.resolver.unstable_enablePackageExports = false;

// Custom resolver to handle react-native-svg for web
const originalResolver = config.resolver.resolverMainFields;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-svg' && platform === 'web') {
    return {
      filePath: require.resolve('react-native-svg-web'),
      type: 'sourceFile',
    };
  }
  // Use default resolver for everything else
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config; 
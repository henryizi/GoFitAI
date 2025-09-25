const { getDefaultConfig } = require('expo/metro-config');
const { MetroConfig } = require('@expo/metro-runtime');

const config = getDefaultConfig(__dirname);

// Ensure Metro always uses port 8081
config.server = {
  ...config.server,
  port: 8081,
};

// Explicitly configure for React 19 and new architecture
config.resolver = {
  ...config.resolver,
  // Ensure proper TypeScript resolution
  nodeModulesPath: [__dirname + '/node_modules'],
  // Enable React 19 imports
  alias: {
    ...config.resolver.alias,
    'react': 'react',
    'react-dom': 'react-dom',
  },
  // Ensure TypeScript files are properly resolved
  sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'],
};

// Configure for new architecture
config.transformer = {
  ...config.transformer,
  // Ensure proper JSX handling
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
  // Enable React 19 JSX runtime
  enableBabelRCLookup: false,
  // Add TypeScript support
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Enable TypeScript support
config.transformer.experimentalImportSupport = false;
config.transformer.inlineRequires = true;

module.exports = config;
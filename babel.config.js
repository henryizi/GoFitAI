module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-class-static-block',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
        },
      ],
      'react-native-reanimated/plugin',
      // Use transform-runtime with helpers to provide TypeScript helpers
      ['@babel/plugin-transform-runtime', {
        'regenerator': true,
        'helpers': true,
      }],
    ],
    // Explicitly configure for React 19 and new architecture
    overrides: [
      {
        test: /\.(tsx?)$/,
        presets: [
          ['babel-preset-expo', { jsxRuntime: 'automatic' }],
        ],
        plugins: [
          // Add TypeScript helpers plugin for TSX files
          '@babel/plugin-transform-typescript',
        ],
      },
    ],
  };
}; 
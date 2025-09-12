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
            tslib: 'tslib/tslib.js',
          },
        },
      ],
      // 'expo-router/babel' removed as it's deprecated in SDK 50
      'react-native-reanimated/plugin',
    ],
  };
}; 
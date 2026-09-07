const { withPodfileProperties } = require('@expo/config-plugins');

module.exports = function withIosSourceModules(config) {
  return withPodfileProperties(config, config => {
    config.modResults.EXPO_USE_PRECOMPILED_MODULES = 'false';
    return config;
  });
};

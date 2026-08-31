const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const isWebPreview = process.argv.includes('--web') || process.env.ACNH_WEB_PREVIEW === '1';

if (isWebPreview) {
  config.resolver.blockList = /src[\\/]data[\\/]assets[\\/]catalog[\\/].*/;
}

module.exports = config;

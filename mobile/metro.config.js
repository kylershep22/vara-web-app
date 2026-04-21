// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Note: inlineRequires was removed after Expo SDK 54 upgrade.
// Metro 0.83's inlineRequires causes "property is not configurable" errors
// when lazy getters fire during component rendering. The original cascade
// crash that required inlineRequires was caused by circular deps and
// "export *" barrels — both now fixed with explicit re-exports.

module.exports = config;

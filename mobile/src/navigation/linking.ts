/**
 * Deep Linking Configuration
 * Handles vara:// URL scheme for the app
 */

import { LinkingOptions } from '@react-navigation/native';
import { config } from '../config/env';

// Define the navigation param list types (simplified)
type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  EmailVerification: undefined;
};

/**
 * Linking configuration for React Navigation
 * Handles deep links like vara://login
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'vara://',
    `https://${config.firebaseProjectId}.web.app`,
    'https://varawellness.co',
  ],
  config: {
    screens: {
      // Map deep link paths to screen names
      Login: 'login',
      Main: 'main',
      EmailVerification: 'verify',
    },
  },
};

export default linking;

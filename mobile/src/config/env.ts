/**
 * Environment Configuration
 * Manages environment variables for the mobile app
 */

import Constants from 'expo-constants';

// Type for environment variables
interface EnvConfig {
  // Firebase
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
  firebaseIosAppId?: string;
  firebaseAndroidAppId?: string;

  // API
  apiUrl: string;
  apiBasePath: string;

  // App
  environment: 'development' | 'staging' | 'production';
  debug: boolean;

  // Subscriptions
  iosProductMonthly: string;
  iosProductAnnual: string;
  androidProductMonthly: string;
  androidProductAnnual: string;
  trialDurationDays: number;

  // Development
  useEmulators: boolean;
}

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: string, fallback: string = ''): string {
  return process.env[key] || Constants.expoConfig?.extra?.[key] || fallback;
}

/**
 * App Configuration
 * Centralized access to environment variables
 */
export const config: EnvConfig = {
  // Firebase Configuration
  firebaseApiKey: getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY'),
  firebaseAuthDomain: getEnvVar('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'vara-4a99f.firebaseapp.com'),
  firebaseProjectId: getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'vara-4a99f'),
  firebaseStorageBucket: getEnvVar('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'vara-4a99f.firebasestorage.app'),
  firebaseMessagingSenderId: getEnvVar('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  firebaseAppId: getEnvVar('EXPO_PUBLIC_FIREBASE_APP_ID'),
  firebaseIosAppId: getEnvVar('EXPO_PUBLIC_FIREBASE_IOS_APP_ID'),
  firebaseAndroidAppId: getEnvVar('EXPO_PUBLIC_FIREBASE_ANDROID_APP_ID'),

  // API Configuration
  apiUrl: getEnvVar('EXPO_PUBLIC_API_URL', 'http://localhost:5001'),
  apiBasePath: getEnvVar('EXPO_PUBLIC_API_BASE_PATH', '/api'),

  // App Configuration
  environment: (getEnvVar('EXPO_PUBLIC_ENV', 'development') as EnvConfig['environment']),
  debug: getEnvVar('EXPO_PUBLIC_DEBUG', 'true') === 'true',

  // Subscription Configuration
  iosProductMonthly: getEnvVar('EXPO_PUBLIC_IOS_PRODUCT_MONTHLY', 'com.vara.monthly'),
  iosProductAnnual: getEnvVar('EXPO_PUBLIC_IOS_PRODUCT_ANNUAL', 'com.vara.annual'),
  androidProductMonthly: getEnvVar('EXPO_PUBLIC_ANDROID_PRODUCT_MONTHLY', 'vara_monthly'),
  androidProductAnnual: getEnvVar('EXPO_PUBLIC_ANDROID_PRODUCT_ANNUAL', 'vara_annual'),
  trialDurationDays: parseInt(getEnvVar('EXPO_PUBLIC_TRIAL_DURATION_DAYS', '7'), 10),

  // Development Configuration
  useEmulators: getEnvVar('EXPO_PUBLIC_USE_EMULATORS', 'false') === 'true',
};

// Validation: Log missing critical environment variables in development
if (config.debug && __DEV__) {
  const missingVars: string[] = [];

  if (!config.firebaseApiKey) missingVars.push('EXPO_PUBLIC_FIREBASE_API_KEY');
  if (!config.firebaseMessagingSenderId) missingVars.push('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  if (!config.firebaseAppId) missingVars.push('EXPO_PUBLIC_FIREBASE_APP_ID');

  if (missingVars.length > 0) {
    console.warn(
      '⚠️ Missing environment variables:\n',
      missingVars.map(v => `  - ${v}`).join('\n'),
      '\n\nPlease create a .env file based on .env.example'
    );
  }
}

// Helper to get full API URL
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = config.apiUrl + config.apiBasePath;
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

// Helper to check if running in production
export const isProduction = (): boolean => config.environment === 'production';

// Helper to check if running in development
export const isDevelopment = (): boolean => config.environment === 'development';

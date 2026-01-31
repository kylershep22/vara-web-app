/**
 * Environment Configuration
 * Manages environment variables for the mobile app
 *
 * IMPORTANT: Metro/React Native inlines process.env.EXPO_PUBLIC_* at BUILD TIME.
 * You MUST use static access (process.env.EXPO_PUBLIC_X) not dynamic access (process.env[key]).
 * Dynamic access will NOT work in production builds!
 */

// Note: We use static process.env access, not Constants.expoConfig.extra
// This ensures Metro can inline values at build time

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
 * Get API URL based on environment
 * Uses static process.env access for Metro compatibility
 */
function getApiUrlForEnvironment(): string {
  // Static access - Metro will inline this at build time
  const envValue = process.env.EXPO_PUBLIC_API_URL;
  const environment = process.env.EXPO_PUBLIC_ENV || 'development';

  // If explicitly set in .env, use that
  if (envValue && envValue !== '') {
    return envValue;
  }

  // Otherwise, determine based on environment
  switch (environment) {
    case 'production':
      // Production: Firebase Functions (2nd gen - Cloud Run)
      return 'https://api-u4g4e6pvga-uc.a.run.app';

    case 'staging':
      // Staging: Use same as production for now
      return 'https://api-u4g4e6pvga-uc.a.run.app';

    case 'development':
    default:
      // Development: Use deployed backend for consistency
      // Benefits: No need to run local server, same code in dev/prod
      // To use local server instead: Set EXPO_PUBLIC_API_URL=http://YOUR_IP:5001 in .env
      return 'https://api-u4g4e6pvga-uc.a.run.app';
  }
}

/**
 * App Configuration
 * Centralized access to environment variables
 *
 * CRITICAL: All process.env.EXPO_PUBLIC_* access MUST be static (not dynamic via bracket notation)
 * for Metro to properly inline values at build time.
 */
export const config: EnvConfig = {
  // Firebase Configuration - Using static access for Metro compatibility
  firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'vara-4a99f.firebaseapp.com',
  firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'vara-4a99f',
  firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'vara-4a99f.firebasestorage.app',
  firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  firebaseIosAppId: process.env.EXPO_PUBLIC_FIREBASE_IOS_APP_ID || '',
  firebaseAndroidAppId: process.env.EXPO_PUBLIC_FIREBASE_ANDROID_APP_ID || '',

  // API Configuration
  apiUrl: getApiUrlForEnvironment(),
  apiBasePath: process.env.EXPO_PUBLIC_API_BASE_PATH || '/api',

  // App Configuration
  environment: (process.env.EXPO_PUBLIC_ENV || 'development') as EnvConfig['environment'],
  debug: (process.env.EXPO_PUBLIC_DEBUG || 'true') === 'true',

  // Subscription Configuration
  iosProductMonthly: process.env.EXPO_PUBLIC_IOS_PRODUCT_MONTHLY || 'com.vara.monthly',
  iosProductAnnual: process.env.EXPO_PUBLIC_IOS_PRODUCT_ANNUAL || 'com.vara.annual',
  androidProductMonthly: process.env.EXPO_PUBLIC_ANDROID_PRODUCT_MONTHLY || 'vara_monthly',
  androidProductAnnual: process.env.EXPO_PUBLIC_ANDROID_PRODUCT_ANNUAL || 'vara_annual',
  trialDurationDays: parseInt(process.env.EXPO_PUBLIC_TRIAL_DURATION_DAYS || '7', 10),

  // Development Configuration
  useEmulators: (process.env.EXPO_PUBLIC_USE_EMULATORS || 'false') === 'true',
};

// Validation: Log missing critical environment variables in development
if (__DEV__) {
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

  // Log active configuration
  console.log('🔧 App Configuration:');
  console.log(`  📍 Environment: ${config.environment}`);
  console.log(`  🌐 API URL: ${config.apiUrl}${config.apiBasePath}`);
  console.log(`  🔥 Firebase Project: ${config.firebaseProjectId}`);
  console.log(`  🔑 API Key: ${config.firebaseApiKey ? config.firebaseApiKey.substring(0, 10) + '...' : 'MISSING'}`);
}

// Also log in production for debugging (only key presence, not values)
if (!__DEV__) {
  console.log('🔧 Production Config Check:');
  console.log(`  🔥 Firebase Project: ${config.firebaseProjectId}`);
  console.log(`  🔑 API Key present: ${!!config.firebaseApiKey}`);
  console.log(`  📱 App ID present: ${!!config.firebaseAppId}`);
  console.log(`  📨 Messaging Sender ID present: ${!!config.firebaseMessagingSenderId}`);
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

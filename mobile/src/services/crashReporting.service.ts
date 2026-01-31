/**
 * Crash Reporting Service (Sentry)
 * FREE crash reporting and error tracking
 * https://sentry.io
 *
 * IMPORTANT: Sentry import REMOVED to prevent native crashes during React Native bridge initialization.
 * The import of sentry-expo was loading native modules at module load time, causing crashes.
 * Do NOT re-add the import until we have a safe initialization strategy.
 */

// REMOVED: import * as Sentry from 'sentry-expo';
// This import was loading native Sentry SDK at module load time, causing crashes

/**
 * Initialize Sentry
 * Call this early in app startup
 */
export const initializeCrashReporting = (): void => {
  // DISABLED: Sentry initialization causes native crashes during React Native bridge init
  // Re-enable after fixing native module initialization timing
  if (__DEV__) {
    console.log('⚠️  Crash reporting disabled to prevent native crashes');
  }
  return;

  // Original code commented out - DO NOT UNCOMMENT until native crash is fixed
  /*
  try {
    // Only initialize if Sentry is available and properly imported
    if (!Sentry || typeof Sentry.init !== 'function') {
      if (__DEV__) {
        console.warn('⚠️  Sentry not available, skipping crash reporting initialization');
      }
      return;
    }

    Sentry.init({
      // Get your DSN from: https://sentry.io/settings/projects/
      // For now, we'll set it via environment variable
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
      enableInExpoDevelopment: false, // Don't send crashes during development
      debug: false, // Disable debug logging to prevent issues
      environment: process.env.EXPO_PUBLIC_ENV || 'production',
    });

    if (__DEV__) {
      console.log('🔍 Sentry crash reporting initialized');
      if (!process.env.EXPO_PUBLIC_SENTRY_DSN) {
        console.warn('⚠️  SENTRY_DSN not set. Crashes will not be reported.');
        console.warn('   Sign up at https://sentry.io and add EXPO_PUBLIC_SENTRY_DSN to .env');
      }
    }
  } catch (error) {
    // Silently fail in production, log in development
    if (__DEV__) {
      console.error('Failed to initialize Sentry:', error);
    }
    // Don't throw - allow app to continue without crash reporting
  }
  */
};

/**
 * Set user identifier for crash reports
 * @param userId - User ID from Firebase Auth
 */
export const setUserId = (userId: string): void => {
  // DISABLED: Sentry removed to prevent native crashes
  return;
};

/**
 * Set user attributes (email, name, etc.)
 * @param attributes - Key-value pairs of user attributes
 */
export const setUserAttributes = (attributes: Record<string, string>): void => {
  // DISABLED: Sentry removed to prevent native crashes
  return;
};

/**
 * Clear user data (on logout)
 */
export const clearUser = (): void => {
  // DISABLED: Sentry removed to prevent native crashes
  return;
};

/**
 * Log a non-fatal error
 * Use this for caught exceptions you want to track
 * @param error - Error object
 * @param context - Additional context about the error
 */
export const logError = (error: Error, context?: string): void => {
  // Always log to console (Sentry disabled to prevent native crashes)
  if (__DEV__) {
    console.error('Error:', error, context ? `Context: ${context}` : '');
  }
  // DISABLED: Sentry removed to prevent native crashes
  return;
};

/**
 * Log a custom message (breadcrumb)
 * Useful for debugging crash context
 * @param message - Log message
 * @param level - Log level (info, warning, error)
 */
export const log = (message: string, level: 'info' | 'warning' | 'error' = 'info'): void => {
  // DISABLED: Sentry removed to prevent native crashes
  return;
};

/**
 * Set custom key-value pairs for crash context
 * @param key - Key name
 * @param value - Value (string, number, or boolean)
 */
export const setCustomKey = (key: string, value: string | number | boolean): void => {
  // DISABLED: Sentry removed to prevent native crashes
  return;
};

/**
 * Track screen view
 * @param screenName - Name of the screen
 */
export const logScreenView = (screenName: string): void => {
  // DISABLED: Sentry removed to prevent native crashes
  return;
};

/**
 * Capture a message (not an error, just info/warning)
 * @param message - Message to capture
 * @param level - Severity level
 */
export const captureMessage = (
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void => {
  // DISABLED: Sentry removed to prevent native crashes
  return;
};

export default {
  initializeCrashReporting,
  setUserId,
  setUserAttributes,
  clearUser,
  logError,
  log,
  setCustomKey,
  logScreenView,
  captureMessage,
};

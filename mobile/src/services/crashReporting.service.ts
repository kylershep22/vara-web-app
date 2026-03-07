/**
 * Crash Reporting Service
 *
 * Infrastructure for @sentry/react-native crash reporting.
 *
 * ACTIVATION STEPS:
 * 1. npm uninstall sentry-expo && npm install @sentry/react-native
 * 2. npx sentry-wizard -i reactNative -p ios android
 * 3. Add @sentry/react-native plugin to app.json plugins array
 * 4. Set EXPO_PUBLIC_SENTRY_DSN in .env
 * 5. Uncomment the Sentry import and function bodies below
 * 6. Rebuild with EAS (native module required)
 */

import { logger } from '../utils/logger';

// Uncomment after installing @sentry/react-native:
// import * as Sentry from '@sentry/react-native';

let isInitialized = false;

/**
 * Initialize Sentry crash reporting
 * Call this early in app startup (App.tsx)
 */
export const initializeCrashReporting = (): void => {
  // Uncomment after installing @sentry/react-native:
  /*
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    logger.warn('SENTRY_DSN not set — crash reporting disabled');
    return;
  }

  try {
    Sentry.init({
      dsn,
      beforeSend: (event) => {
        // Strip PII from crash events
        if (event.user) {
          delete event.user.email;
          delete event.user.username;
          delete event.user.ip_address;
        }
        // Strip request bodies that may contain health/wellness data
        if (event.request?.data) {
          delete event.request.data;
        }
        return event;
      },
      environment: process.env.EXPO_PUBLIC_ENV || 'production',
      enabled: !__DEV__,
    });
    isInitialized = true;
    logger.log('Crash reporting initialized');
  } catch (error) {
    logger.error('Failed to initialize crash reporting:', error);
  }
  */

  logger.log('Crash reporting: infrastructure ready, awaiting @sentry/react-native setup');
};

/**
 * Set anonymized user identifier for crash reports
 * Only UID — no PII (email, displayName)
 */
export const setUserId = (userId: string): void => {
  if (!isInitialized) return;
  // Sentry.setUser({ id: userId });
};

/**
 * Set user attributes for crash context
 * Only anonymized data — no PII
 */
export const setUserAttributes = (attributes: Record<string, string>): void => {
  if (!isInitialized) return;
  // Sentry.setUser({ id: attributes.userId });
};

/**
 * Clear user data (on logout)
 */
export const clearUser = (): void => {
  if (!isInitialized) return;
  // Sentry.setUser(null);
};

/**
 * Record a non-fatal error
 */
export const logError = (error: Error, context?: string): void => {
  if (__DEV__) {
    logger.error('Error:', error);
  }
  if (!isInitialized) return;
  // Sentry.captureException(error, { extra: { context } });
};

/**
 * Log a breadcrumb for crash context
 */
export const log = (message: string, level: 'info' | 'warning' | 'error' = 'info'): void => {
  if (!isInitialized) return;
  // Sentry.addBreadcrumb({ message, level });
};

/**
 * Set custom key-value for crash context
 */
export const setCustomKey = (key: string, value: string | number | boolean): void => {
  if (!isInitialized) return;
  // Sentry.setExtra(key, value);
};

/**
 * Track screen view as breadcrumb
 */
export const logScreenView = (screenName: string): void => {
  if (!isInitialized) return;
  // Sentry.addBreadcrumb({ message: `Screen: ${screenName}`, category: 'navigation' });
};

/**
 * Capture a message (not an error)
 */
export const captureMessage = (
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void => {
  if (!isInitialized) return;
  // Sentry.captureMessage(message, level);
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

/* eslint-disable no-console */
const isDev = __DEV__;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (message: string, error?: unknown) => {
    console.error(message, error);
    // When crash reporting is restored: crashReporting.recordError(error)
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.log('[DEBUG]', ...args);
  },
};

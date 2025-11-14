/**
 * Structured logging utility for production debugging
 *
 * Logs are formatted for easy searching in Firebase Console
 * Use this instead of console.log/error for production code
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log levels
 */
const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

/**
 * Format log entry with timestamp and context
 */
function formatLog(level, message, context = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
}

/**
 * Log to console (all environments)
 */
function log(level, message, context) {
  const logEntry = formatLog(level, message, context);

  // Always log to console
  const consoleMethod = {
    [LogLevel.DEBUG]: console.log,
    [LogLevel.INFO]: console.info,
    [LogLevel.WARN]: console.warn,
    [LogLevel.ERROR]: console.error
  }[level] || console.log;

  if (isDevelopment) {
    // Pretty print in development
    consoleMethod(`[${level}]`, message, context);
  } else {
    // JSON format in production for easy parsing
    consoleMethod(JSON.stringify(logEntry));
  }

  // In production, you could also send to external logging service here
  // Example: sendToLoggingService(logEntry);
}

/**
 * Public logging methods
 */
export const logger = {
  /**
   * Debug logging (verbose, only in development)
   */
  debug: (message, context = {}) => {
    if (isDevelopment) {
      log(LogLevel.DEBUG, message, context);
    }
  },

  /**
   * Info logging (general information)
   */
  info: (message, context = {}) => {
    log(LogLevel.INFO, message, context);
  },

  /**
   * Warning logging (something unexpected but not an error)
   */
  warn: (message, context = {}) => {
    log(LogLevel.WARN, message, context);
  },

  /**
   * Error logging (something went wrong)
   */
  error: (message, error = null, context = {}) => {
    const errorContext = {
      ...context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null
    };
    log(LogLevel.ERROR, message, errorContext);
  },

  /**
   * Track user actions (for analytics/debugging)
   */
  event: (eventName, eventData = {}) => {
    log(LogLevel.INFO, `Event: ${eventName}`, {
      eventName,
      ...eventData
    });

    // Send to analytics service if needed
    if (window.gtag) {
      window.gtag('event', eventName, eventData);
    }
  }
};

export default logger;

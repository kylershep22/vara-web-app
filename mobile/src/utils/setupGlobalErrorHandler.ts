/**
 * Global Error Handler Setup
 *
 * MUST be imported before any other app code to catch fatal errors during
 * module evaluation. React Native's default handler calls native abort()
 * on fatal JS errors, causing instant SIGABRT crashes. This replaces it
 * with a handler that logs but does not abort, allowing the ErrorBoundary
 * to display a recovery UI.
 *
 * Why this file exists separately:
 * ES imports are hoisted — all imports in index.ts evaluate before any
 * code in the module body runs. If we set the handler in index.ts body
 * (after `import App`), it's too late: errors during App's import tree
 * evaluation hit the default handler and abort.
 */

declare const ErrorUtils: {
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    // Enhanced logging to diagnose "property is not configurable" errors
    console.error(
      `[Global Error Handler] ${isFatal ? 'FATAL' : 'non-fatal'}:`,
      error?.message || error,
      '\nStack:', error?.stack?.split('\n').slice(0, 8).join('\n')
    );

    // For non-fatal errors, delegate to the original handler
    // For fatal errors, do NOT call the original handler — it calls native abort()
    if (!isFatal && originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

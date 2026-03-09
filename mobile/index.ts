import { LogBox } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';

// Prevent unhandled JS exceptions from crashing the app with SIGABRT.
// In production, React Native's default global handler calls abort() on
// fatal errors, which kills the app instantly. By replacing it, we let
// the ErrorBoundary show a recovery UI instead.
//
// ErrorUtils is a global injected by React Native before any JS runs.
declare const ErrorUtils: {
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    // Always log the error
    console.error(`[Global Error Handler] ${isFatal ? 'FATAL' : 'non-fatal'}:`, error);

    // For non-fatal errors, delegate to the original handler
    // For fatal errors, log but don't call the original handler (which would abort)
    if (!isFatal && originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

// Suppress noisy yellow-box warnings in development
if (__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
  ]);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

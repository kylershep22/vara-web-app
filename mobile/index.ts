// CRITICAL: This import MUST be first. It sets the global error handler
// before any other modules evaluate. Without this, a fatal JS error during
// module evaluation (e.g., from a service importing null db) calls native
// abort() and crashes the app with SIGABRT before ErrorBoundary can help.
import './src/utils/setupGlobalErrorHandler';

import { LogBox } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';

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

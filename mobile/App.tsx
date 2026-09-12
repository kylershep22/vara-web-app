/**
 * Vara Wellness Mobile App
 * Main entry point
 *
 * Uses dynamic import for AppRoot with pre-loaded dependencies.
 * metro.config.js enables inlineRequires which lazily initializes modules,
 * preventing the cascade crash that occurred with static imports.
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Safe static imports — constants and theme have no native module deps
import { Colors, theme } from './src/constants';

// Static imports of contexts & navigation — with inlineRequires enabled,
// these won't trigger eager module initialization cascade
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { AudioPlayerProvider } from './src/context/AudioPlayerContext';
import { AIConsentProvider } from './src/context/AIConsentContext';
import AppNavigator from './src/navigation/AppNavigator';
import { AudioMiniPlayer } from './src/components/library/AudioMiniPlayer';
import { AudioExpandedPlayer } from './src/components/library/AudioExpandedPlayer';
import { useAudioPlayer } from './src/context/AudioPlayerContext';
import ErrorBoundary from './src/components/shared/ErrorBoundary';
import { logger } from './src/utils/logger';

// HOLD THE NATIVE SPLASH UNTIL THE FONTS RESOLVE (R1a, UI Standards 5.1).
//
// This call did not exist before R1a and neither did the gate below. The splash
// auto-hid as soon as the bundle mounted, and `hideAsync` in the effect was
// hiding something already gone. That cost nothing while Inter was loaded and
// rendered nowhere. It costs a flash of system-font text on every cold start
// the moment the primitive makes the faces load-bearing, and a layout shift
// with it, because Inter's metrics are not the system font's.
//
// The promise is caught: it rejects harmlessly if the splash is already hidden.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * How long the app waits for the four bundled Inter faces before giving up and
 * rendering in the system font.
 *
 * The files are local, not network, so no real device should ever reach this.
 * It exists so that a font subsystem failure costs a typeface rather than the
 * whole app: a gate with no timeout is a hang.
 */
const FONT_TIMEOUT_MS = 3000;

function AudioPlayerOverlay() {
  const { currentTrack, isExpanded } = useAudioPlayer();
  if (!currentTrack) return null;
  return isExpanded ? <AudioExpandedPlayer /> : <AudioMiniPlayer />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter_18pt-Regular': require('./assets/fonts/Inter_18pt-Regular.ttf'),
    'Inter_18pt-Medium': require('./assets/fonts/Inter_18pt-Medium.ttf'),
    'Inter_18pt-SemiBold': require('./assets/fonts/Inter_18pt-SemiBold.ttf'),
    'Inter_18pt-Bold': require('./assets/fonts/Inter_18pt-Bold.ttf'),
  });

  // THE TIMEOUT ARM. Starts on mount, cleared the moment the fonts resolve
  // either way, so a fast load never leaves a timer running.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (fontsLoaded || fontError) return undefined;
    const id = setTimeout(() => setTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [fontsLoaded, fontError]);

  // READY MEANS "STOP WAITING", NOT "THE FONTS LOADED". An error or a timeout
  // proceeds in the system font rather than holding the user on a splash.
  const ready = fontsLoaded || !!fontError || timedOut;

  // `logger.warn`, not `logger.log`: log is __DEV__-gated and invisible on a
  // device, which is exactly where this diagnostic is needed.
  useEffect(() => {
    if (fontError) {
      logger.warn(
        '[fonts] Inter failed to load; rendering in the system font.',
        fontError
      );
    }
  }, [fontError]);

  useEffect(() => {
    if (timedOut && !fontsLoaded) {
      logger.warn(
        `[fonts] Inter did not resolve within ${FONT_TIMEOUT_MS}ms; rendering in the system font.`
      );
    }
  }, [timedOut, fontsLoaded]);

  // Hide the native splash on the READY transition, not on `fontsLoaded`
  // alone: gating on the latter leaves the splash up forever on a font error.
  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch((e) =>
        console.warn('SplashScreen.hideAsync failed (non-fatal):', e)
      );
    }
  }, [ready]);

  // Initialize optional services after mount.
  //
  // Analytics has no initializer any more. The event pipe writes through the
  // Firebase JS SDK the app already configures at boot, so there is nothing to
  // set up and no SDK handle to hold.
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const { initializeCrashReporting } = await import('./src/services/crashReporting.service');
        try { initializeCrashReporting(); } catch (e) { /* non-critical */ }
      } catch (e) { /* non-critical */ }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Initialize RevenueCat SDK once at boot. configurePurchases() is platform-aware
  // and no-ops gracefully on missing API key. AuthContext later calls
  // identifyPurchaser(uid) / clearPurchaser() as auth state changes — those calls
  // await the same internal gate this configure resolves, so ordering is safe.
  useEffect(() => {
    (async () => {
      try {
        const { configurePurchases } = await import('./src/services/purchases.service');
        configurePurchases();
      } catch (e) {
        console.warn('RevenueCat init skipped (non-fatal):', e);
      }
    })();
  }, []);

  // Sub-step 2.7 round 2 — Observation 7: global audio mode for
  // protocol audio (NSDR) and the wellness library audio player.
  // setAudioModeAsync is global state; setting it once at app boot
  // covers every Audio.Sound created downstream
  // (AudioStepView in GuidedSessionPlayer, AudioPlayerContext,
  // useAmbientSound). Pairs with ios.infoPlist.UIBackgroundModes
  // = ["audio"] in app.json — both are required for audio to
  // continue through screen lock.
  useEffect(() => {
    (async () => {
      try {
        const { Audio } = await import('expo-av');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
      } catch (e) {
        console.warn(
          'Failed to set global audio mode (non-critical, audio may pause on screen lock):',
          e
        );
      }
    })();
  }, []);

  // Hold the tree until `ready`. The native splash is still up at this point,
  // so the user sees the splash rather than a blank frame.
  if (!ready) return null;

  return (
    // THE BACKSTOP, NOT THE ONLY BOUNDARY ANY MORE (slice 7g). Every screen and
    // every tab now carries its own surface-scoped boundary, installed by
    // `screenLayout` on the two navigators in navigation/AppNavigator.tsx. This
    // one keeps `scope="app"` and stays because it covers what no screen
    // boundary can: the seven providers below, NavigationContainer itself,
    // OfflineIndicator and AudioPlayerOverlay. A throw in any of those is still
    // the whole app, and the app-scoped copy is the truthful one for it.
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <AuthProvider>
              <ToastProvider>
                <NotificationProvider>
                  <AudioPlayerProvider>
                    <AIConsentProvider>
                      <StatusBar style="auto" />
                      <AppNavigator />
                      <AudioPlayerOverlay />
                    </AIConsentProvider>
                  </AudioPlayerProvider>
                </NotificationProvider>
              </ToastProvider>
            </AuthProvider>
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

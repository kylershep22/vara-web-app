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
import { StyleSheet, View, Text, ActivityIndicator, ScrollView } from 'react-native';
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

  // Hide native splash once fonts are loaded
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch((e) =>
        console.warn('SplashScreen.hideAsync failed (non-fatal):', e)
      );
    }
  }, [fontsLoaded]);

  // Initialize optional services after mount
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const { initializeCrashReporting } = await import('./src/services/crashReporting.service');
        const { initializeAnalytics } = await import('./src/services/analytics.service');
        try { initializeCrashReporting(); } catch (e) { /* non-critical */ }
        try { initializeAnalytics(); } catch (e) { /* non-critical */ }
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

  return (
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

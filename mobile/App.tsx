/**
 * Vara Wellness Mobile App
 * Main entry point
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet, View, Text, Platform, TouchableOpacity } from 'react-native';

// Import theme
import { theme } from './src/constants';

// Import Firebase initialization status
import { firebaseInitialized, firebaseError } from './src/config/firebase';

// Import Auth Provider
import { AuthProvider } from './src/context/AuthContext';

// Import Notification Provider
import { NotificationProvider } from './src/context/NotificationContext';

// Import Audio Player Provider
import { AudioPlayerProvider } from './src/context/AudioPlayerContext';

// Import Toast Provider (feature discovery)
import { ToastProvider } from './src/context/ToastContext';

// Import navigation
import AppNavigator from './src/navigation/AppNavigator';

// Import Audio Player components
import { AudioMiniPlayer, AudioExpandedPlayer } from './src/components';
import { useAudioPlayer } from './src/context/AudioPlayerContext';

// Import Error Boundary
import ErrorBoundary from './src/components/shared/ErrorBoundary';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// DO NOT initialize services at module load time - causes native crashes
// Services will be initialized in useEffect after React Native bridge is ready

/**
 * Audio Player Overlay
 * Conditionally renders mini or expanded player based on context state.
 * Must be rendered inside AudioPlayerProvider.
 */
function AudioPlayerOverlay() {
  const { currentTrack, isExpanded } = useAudioPlayer();
  if (!currentTrack) return null;
  return isExpanded ? <AudioExpandedPlayer /> : <AudioMiniPlayer />;
}

// Firebase Initialization Error Screen Component
function FirebaseInitializationError({ error }: { error: Error }) {
  const handleRestart = () => {
    // In React Native, we can't truly restart the app from JavaScript
    // But we can provide helpful instructions
    console.log('User requested app restart');
  };

  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorContent}>
        <Text style={styles.errorEmoji}>🔥</Text>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorMessage}>
          Unable to connect to Vara Wellness services.
          {'\n\n'}
          Please check your internet connection and restart the app.
        </Text>
        {__DEV__ && (
          <View style={styles.errorDetails}>
            <Text style={styles.errorDetailsText}>
              {error.message}
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.errorButton} onPress={handleRestart}>
          <Text style={styles.errorButtonText}>Restart App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function App() {
  const [servicesInitialized, setServicesInitialized] = useState(false);

  // Initialize services AFTER React Native bridge is ready
  useEffect(() => {
    const initializeServices = async () => {
      try {
        console.log('🚀 Initializing app services after mount...');

        // Import services dynamically to avoid early native module access
        const { initializeCrashReporting } = await import('./src/services/crashReporting.service');
        const { initializeAnalytics } = await import('./src/services/analytics.service');

        // Initialize with extra safety
        try {
          initializeCrashReporting();
        } catch (crashReportingError) {
          console.warn('Crash reporting initialization failed (non-critical):', crashReportingError);
        }

        try {
          initializeAnalytics();
        } catch (analyticsError) {
          console.warn('Analytics initialization failed (non-critical):', analyticsError);
        }

        setServicesInitialized(true);
        console.log('✅ App services initialized successfully');
      } catch (error) {
        console.error('Failed to initialize services:', error);
        // Continue anyway - these services are optional
        setServicesInitialized(true);
      }
    };

    // Wait a tick to ensure React Native bridge is fully ready
    const timer = setTimeout(initializeServices, 100);
    return () => clearTimeout(timer);
  }, []);

  // Log Firebase initialization status but don't block the app
  useEffect(() => {
    if (firebaseError) {
      console.error('🚨 Firebase initialization error (non-blocking):', firebaseError.message);
      console.log('ℹ️ App will continue to load. Auth features will show error messages when accessed.');
    } else if (firebaseInitialized) {
      console.log('✅ Firebase initialized successfully');
    }
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <PaperProvider theme={theme}>
              <AuthProvider>
                <ToastProvider>
                  <NotificationProvider>
                    <AudioPlayerProvider>
                      <StatusBar style="auto" />
                      <AppNavigator />
                      <AudioPlayerOverlay />
                    </AudioPlayerProvider>
                  </NotificationProvider>
                </ToastProvider>
              </AuthProvider>
            </PaperProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorDetails: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  errorDetailsText: {
    fontSize: 12,
    color: '#E53935',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorButton: {
    backgroundColor: '#1B5E57',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
